
import { createHash } from "node:crypto";
import pool from "./mysql.js";

const hashToken = (token) =>
  createHash("sha256").update(token).digest("hex");

export default async function requireCustomerSession(req, res, next) {
  const token = req.cookies?.manpasand_customer_session;

  if (!token || typeof token !== "string") {
    return res.status(401).json({
      success: false,
      error: "Please log in to manage your delivery addresses.",
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
      return res.status(401).json({
        success: false,
        error: "Your session has expired. Please log in again.",
      });
    }

    req.customer = {
      id: rows[0].id,
      fullName: rows[0].full_name,
      phone: rows[0].phone,
      email: rows[0].email,
    };

    next();
  } catch (error) {
    console.error("Customer session verification failed:", error.message);

    return res.status(500).json({
      success: false,
      error: "Unable to verify your session right now.",
    });
  }
}
