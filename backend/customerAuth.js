import express from "express";
import "dotenv/config";
import {
  randomInt,
  randomBytes,
  createHash,
  timingSafeEqual,
  scrypt as scryptCallback
} from "node:crypto";
import { promisify } from "node:util";
import { Resend } from "resend";
import pool from "./mysql.js";

const router = express.Router();
const scrypt = promisify(scryptCallback);

const OTP_EXPIRY_MINUTES = 10;
const OTP_RESEND_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;
const SESSION_DAYS = 30;

const normalizeEmail = (email) =>
  String(email || "").trim().toLowerCase();

const hashToken = (token) =>
  createHash("sha256").update(token).digest("hex");

const validEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
  email.length <= 254;

async function hashOtp(otp) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(otp, salt, 64);

  return `${salt}:${derived.toString("hex")}`;
}

async function verifyOtpHash(otp, storedHash) {
  const [salt, hash] = String(storedHash || "").split(":");

  if (!salt || !hash || !/^[a-f0-9]{128}$/i.test(hash)) {
    return false;
  }

  const expected = Buffer.from(hash, "hex");
  const actual = await scrypt(otp, salt, 64);

  return (
    expected.length === actual.length &&
    timingSafeEqual(expected, actual)
  );
}

function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  return new Resend(process.env.RESEND_API_KEY);
}

function getSender() {
  const sender = process.env.RESEND_FROM_EMAIL?.trim();

  if (!sender) {
    throw new Error(
      "RESEND_FROM_EMAIL is missing from the backend .env file."
    );
  }

  return sender;
}

function safeError(res, error, message) {
  console.error(message, error);

  return res.status(500).json({
    success: false,
    error: "The request could not be completed. Please try again later."
  });
}

// Request an email OTP.
router.post("/request-otp", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const fullName = String(req.body?.fullName || "").trim();
  const phone = String(req.body?.phone || "").trim();

  if (!validEmail(email)) {
    return res.status(400).json({
      success: false,
      error: "Enter a valid email address."
    });
  }

  if (
    (fullName && fullName.length > 150) ||
    phone.length > 20
  ) {
    return res.status(400).json({
      success: false,
      error: "Name or phone number is too long."
    });
  }

  let connection;
  let otpRecordId = null;

  try {
    const resend = getResendClient();
    const sender = getSender();

    connection = await pool.getConnection();

    const [customerRows] = await connection.execute(
      `SELECT id, full_name, phone, is_active
       FROM customers
       WHERE email = ?
       LIMIT 1`,
      [email]
    );

    const existingCustomer = customerRows[0];

    if (existingCustomer && !existingCustomer.is_active) {
      return res.status(403).json({
        success: false,
        error: "This customer account is inactive."
      });
    }

    if (!existingCustomer && (!fullName || !phone)) {
      return res.status(400).json({
        success: false,
        error: "For a new account, provide your full name and phone number."
      });
    }

    if (!existingCustomer) {
      const [phoneRows] = await connection.execute(
        "SELECT id FROM customers WHERE phone = ? LIMIT 1",
        [phone]
      );

      if (phoneRows.length > 0) {
        return res.status(409).json({
          success: false,
          error: "That phone number is already registered."
        });
      }
    }

    const [recentRows] = await connection.execute(
      `SELECT TIMESTAMPDIFF(
         SECOND, last_sent_at, UTC_TIMESTAMP()
       ) AS elapsed_seconds
       FROM customer_email_otps
       WHERE email = ?
       ORDER BY id DESC
       LIMIT 1`,
      [email]
    );

    if (recentRows.length > 0) {
      const elapsedSeconds = Number(
        recentRows[0].elapsed_seconds
      );

      if (elapsedSeconds < OTP_RESEND_SECONDS) {
        return res.status(429).json({
          success: false,
          error: "Please wait before requesting another code.",
          retryAfterSeconds: Math.max(
            1,
            OTP_RESEND_SECONDS - elapsedSeconds
          )
        });
      }
    }

    const otp = String(
      randomInt(0, 1_000_000)
    ).padStart(6, "0");

    const otpHash = await hashOtp(otp);

    await connection.execute(
      "DELETE FROM customer_email_otps WHERE email = ?",
      [email]
    );

    const [insertResult] = await connection.execute(
      `INSERT INTO customer_email_otps
       (
         email,
         otp_hash,
         expires_at,
         attempts,
         last_sent_at,
         full_name,
         phone
       )
       VALUES (
         ?, ?,
         DATE_ADD(UTC_TIMESTAMP(), INTERVAL 10 MINUTE),
         0,
         UTC_TIMESTAMP(),
         ?, ?
       )`,
      [
        email,
        otpHash,
        existingCustomer ? null : fullName,
        existingCustomer ? null : phone
      ]
    );

    otpRecordId = insertResult.insertId;

    const { error } = await resend.emails.send({
      from: sender,
      to: [email],
      subject: "Your Manpasand verification code",
      text:
        `Your Manpasand verification code is ${otp}.\n\n` +
        `It expires in ${OTP_EXPIRY_MINUTES} minutes. ` +
        "Do not share this code with anyone."
    });

    if (error) {
      console.error(
        "Resend rejected the OTP email:",
        error.message
      );

      await connection.execute(
        "DELETE FROM customer_email_otps WHERE id = ?",
        [otpRecordId]
      );

      otpRecordId = null;

      return res.status(502).json({
        success: false,
        error: "Email could not be sent. Check your sender configuration and try again."
      });
    }

    return res.json({
      success: true,
      message: "Verification code requested. Check your email.",
      expiresInSeconds: OTP_EXPIRY_MINUTES * 60
    });
  } catch (error) {
    if (connection && otpRecordId !== null) {
      await connection.execute(
        "DELETE FROM customer_email_otps WHERE id = ?",
        [otpRecordId]
      ).catch(() => {});
    }

    return safeError(res, error, "Request customer OTP failed:");
  } finally {
    connection?.release();
  }
});

// Verify OTP and create a customer session.
router.post("/verify-otp", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const otp = String(req.body?.otp || "").trim();

  if (!validEmail(email) || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({
      success: false,
      error: "Enter a valid email address and six-digit code."
    });
  }

  let connection;
  let transactionStarted = false;

  try {
    connection = await pool.getConnection();

    await connection.beginTransaction();
    transactionStarted = true;

    const [otpRows] = await connection.execute(
      `SELECT
         id,
         otp_hash,
         expires_at,
         attempts,
         full_name,
         phone,
         (expires_at <= UTC_TIMESTAMP()) AS is_expired
       FROM customer_email_otps
       WHERE email = ?
       ORDER BY id DESC
       LIMIT 1
       FOR UPDATE`,
      [email]
    );

    const record = otpRows[0];

    if (!record) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        error: "The code is invalid or expired. Request a new code."
      });
    }

    if (Number(record.attempts) >= OTP_MAX_ATTEMPTS) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(429).json({
        success: false,
        error: "Too many attempts. Request a new code."
      });
    }

    if (Number(record.is_expired) === 1) {
      await connection.execute(
        "DELETE FROM customer_email_otps WHERE id = ?",
        [record.id]
      );

      await connection.commit();
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        error: "The code has expired. Request a new one."
      });
    }

    const matches = await verifyOtpHash(otp, record.otp_hash);

    if (!matches) {
      await connection.execute(
        `UPDATE customer_email_otps
         SET attempts = attempts + 1
         WHERE id = ?`,
        [record.id]
      );

      await connection.commit();
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        error: "The code is invalid or expired."
      });
    }

    const [customerRows] = await connection.execute(
      `SELECT id, full_name, phone, email, is_active
       FROM customers
       WHERE email = ?
       LIMIT 1
       FOR UPDATE`,
      [email]
    );

    let customer = customerRows[0];

    if (!customer) {
      if (!record.full_name || !record.phone) {
        await connection.rollback();
        transactionStarted = false;

        return res.status(400).json({
          success: false,
          error: "Registration details are missing. Request a new code."
        });
      }

      const [insertResult] = await connection.execute(
        `INSERT INTO customers
         (
           full_name,
           phone,
           phone_verified_at,
           email,
           email_verified_at,
           is_active
         )
         VALUES (?, ?, NULL, ?, UTC_TIMESTAMP(), 1)`,
        [record.full_name, record.phone, email]
      );

      customer = {
        id: insertResult.insertId,
        full_name: record.full_name,
        phone: record.phone,
        email,
        is_active: 1
      };
    } else {
      if (!customer.is_active) {
        await connection.rollback();
        transactionStarted = false;

        return res.status(403).json({
          success: false,
          error: "This customer account is inactive."
        });
      }

      await connection.execute(
        `UPDATE customers
         SET email_verified_at = UTC_TIMESTAMP()
         WHERE id = ?`,
        [customer.id]
      );
    }

    if (!customer.is_active) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(403).json({
        success: false,
        error: "This customer account is inactive."
      });
    }

    const sessionToken = randomBytes(32).toString("hex");
    const tokenHash = hashToken(sessionToken);

    await connection.execute(
      `INSERT INTO customer_sessions
       (customer_id, token_hash, expires_at)
       VALUES (
         ?, ?,
         DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 DAY)
       )`,
      [customer.id, tokenHash]
    );

    await connection.execute(
      "DELETE FROM customer_email_otps WHERE email = ?",
      [email]
    );

    await connection.commit();
    transactionStarted = false;

    res.cookie("manpasand_customer_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000
    });

    return res.json({
      success: true,
      customer: {
        id: customer.id,
        fullName: customer.full_name,
        phone: customer.phone,
        email
      },
      expiresInDays: SESSION_DAYS
    });
  } catch (error) {
    if (connection && transactionStarted) {
      await connection.rollback().catch(() => {});
    }

    return safeError(res, error, "Verify customer OTP failed:");
  } finally {
    connection?.release();
  }
});

// Check whether the current customer session is valid.
router.get("/me", async (req, res) => {
  const token = req.cookies?.manpasand_customer_session;

  if (!token) {
    return res.status(401).json({
      success: false,
      authenticated: false
    });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT c.id, c.full_name, c.phone, c.email
       FROM customer_sessions s
       JOIN customers c ON c.id = s.customer_id
       WHERE s.token_hash = ?
         AND s.expires_at > UTC_TIMESTAMP()
         AND c.is_active = 1
       LIMIT 1`,
      [hashToken(token)]
    );

    if (rows.length === 0) {
      res.clearCookie("manpasand_customer_session", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/"
      });

      return res.status(401).json({
        success: false,
        authenticated: false
      });
    }

    return res.json({
      success: true,
      authenticated: true,
      customer: {
        id: rows[0].id,
        fullName: rows[0].full_name,
        phone: rows[0].phone,
        email: rows[0].email
      }
    });
  } catch (error) {
    return safeError(res, error, "Check customer session failed:");
  }
});

// Log out and invalidate the current session.
router.post("/logout", async (req, res) => {
  const token = req.cookies?.manpasand_customer_session;

  try {
    if (token) {
      await pool.execute(
        "DELETE FROM customer_sessions WHERE token_hash = ?",
        [hashToken(token)]
      );
    }

    res.clearCookie("manpasand_customer_session", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/"
    });

    return res.json({
      success: true,
      message: "You have been logged out."
    });
  } catch (error) {
    return safeError(res, error, "Customer logout failed:");
  }
});

export default router;