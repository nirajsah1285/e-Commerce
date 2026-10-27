
import express from "express";
import {
  randomBytes,
  timingSafeEqual,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";
import { generateSecret, generateURI, verify } from "otplib";
import db from "./db.js";

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TWO_FA_FILE = path.join(__dirname, "admin-2fa.json");

const sessions = new Map();
const pendingLogins = new Map();
const pendingSetups = new Map();

const SESSION_DURATION = 8 * 60 * 60 * 1000;
const LOGIN_CHALLENGE_DURATION = 5 * 60 * 1000;
const SETUP_CHALLENGE_DURATION = 10 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;

function passwordMatches(supplied, expected) {
  if (!expected || typeof supplied !== "string") return false;

  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);

  return a.length === b.length && timingSafeEqual(a, b);
}

function getEncryptionKey() {
  const encoded = process.env.ADMIN_2FA_ENCRYPTION_KEY;

  if (!encoded) {
    throw new Error("ADMIN_2FA_ENCRYPTION_KEY is not configured.");
  }

  const key = Buffer.from(encoded, "base64");

  if (key.length !== 32) {
    throw new Error("ADMIN_2FA_ENCRYPTION_KEY must decode to 32 bytes.");
  }

  return key;
}

function setupKeyMatches(supplied) {
  const expected = process.env.ADMIN_2FA_SETUP_KEY;

  if (!expected || typeof supplied !== "string") return false;

  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);

  return a.length === b.length && timingSafeEqual(a, b);
}

function validCodeFormat(code) {
  return typeof code === "string" && /^\d{6}$/.test(code);
}

async function readStoredSecret() {
  let saved;

  try {
    saved = JSON.parse(await readFile(TWO_FA_FILE, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }

  if (
    saved.version !== 1 ||
    !saved.iv ||
    !saved.tag ||
    !saved.data
  ) {
    throw new Error("The stored authenticator configuration is invalid.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(saved.iv, "hex")
  );

  decipher.setAuthTag(Buffer.from(saved.tag, "hex"));

  return Buffer.concat([
    decipher.update(Buffer.from(saved.data, "hex")),
    decipher.final(),
  ]).toString("utf8");
}

async function saveSecretEncrypted(secret) {
  const iv = randomBytes(12);

  const cipher = createCipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);

  const saved = {
    version: 1,
    iv: iv.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"),
    data: encrypted.toString("hex"),
  };

  const tempFile = `${TWO_FA_FILE}.tmp`;

  await writeFile(tempFile, JSON.stringify(saved, null, 2), {
    encoding: "utf8",
    flag: "wx",
  });

  try {
    await rename(tempFile, TWO_FA_FILE);
  } catch (error) {
    const { unlink } = await import("node:fs/promises");
    await unlink(tempFile).catch(() => {});
    throw error;
  }
}

async function verifyTotp(secret, code) {
  if (!validCodeFormat(code)) return false;

  const result = await verify({
    secret,
    token: code,
    epochTolerance: 30,
  });

  return result.valid === true;
}

function createAdminSession(res) {
  const token = randomBytes(32).toString("hex");

  sessions.set(token, Date.now() + SESSION_DURATION);

  return res.json({
    success: true,
    token,
    expiresIn: SESSION_DURATION,
  });
}

// POST /api/admin/login
// Password verification alone never creates an admin session.
router.post("/login", async (req, res) => {
  try {
    const { password } = req.body || {};

    if (!process.env.ADMIN_PASSWORD) {
      return res.status(500).json({
        success: false,
        message: "Admin password is not configured on the server.",
      });
    }

    if (!passwordMatches(password, process.env.ADMIN_PASSWORD)) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin password.",
      });
    }

    const secret = await readStoredSecret();

    if (!secret) {
      return res.status(409).json({
        success: false,
        needsSetup: true,
        message: "Authenticator setup is required.",
      });
    }

    const challengeId = randomBytes(32).toString("hex");

    pendingLogins.set(challengeId, {
      expiresAt: Date.now() + LOGIN_CHALLENGE_DURATION,
      attempts: 0,
    });

    return res.json({
      success: true,
      requiresTwoFactor: true,
      challengeId,
      expiresIn: LOGIN_CHALLENGE_DURATION,
    });
  } catch (error) {
    console.error("Admin login failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not complete login. Check backend configuration.",
    });
  }
});

// POST /api/admin/2fa/setup
// Requires BOTH the admin password and the separate setup key.
router.post("/2fa/setup", async (req, res) => {
  try {
    const { password, setupKey } = req.body || {};

    if (
      !process.env.ADMIN_PASSWORD ||
      !passwordMatches(password, process.env.ADMIN_PASSWORD) ||
      !setupKeyMatches(setupKey)
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid setup credentials.",
      });
    }

    const existingSecret = await readStoredSecret();

    if (existingSecret) {
      return res.status(409).json({
        success: false,
        message: "An authenticator is already configured.",
      });
    }

    // Keep only one pending setup at a time.
    for (const [id, item] of pendingSetups) {
      if (item.expiresAt <= Date.now()) pendingSetups.delete(id);
    }

    const secret = generateSecret();

    const uri = generateURI({
      issuer: "Manpasand",
      label: "Manpasand Admin",
      secret,
    });

    const qrCode = await QRCode.toDataURL(uri);
    const setupToken = randomBytes(32).toString("hex");

    pendingSetups.set(setupToken, {
      secret,
      expiresAt: Date.now() + SETUP_CHALLENGE_DURATION,
      attempts: 0,
    });

    return res.json({
      success: true,
      setupToken,
      qrCode,
      expiresIn: SETUP_CHALLENGE_DURATION,
      message: "Scan the QR code, then verify the six-digit code.",
    });
  } catch (error) {
    console.error("Authenticator setup failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not start authenticator setup.",
    });
  }
});

// POST /api/admin/2fa/enable
// Saves the encrypted secret only after a valid authenticator code.
router.post("/2fa/enable", async (req, res) => {
  try {
    const { setupToken, code } = req.body || {};
    const pending = pendingSetups.get(setupToken);

    if (
      typeof setupToken !== "string" ||
      !pending ||
      pending.expiresAt <= Date.now()
    ) {
      pendingSetups.delete(setupToken);
      return res.status(401).json({
        success: false,
        message: "Setup expired. Start setup again.",
      });
    }

    if (pending.attempts >= MAX_CODE_ATTEMPTS) {
      pendingSetups.delete(setupToken);
      return res.status(429).json({
        success: false,
        message: "Too many attempts. Start setup again.",
      });
    }

    pending.attempts += 1;

    if (!(await verifyTotp(pending.secret, code))) {
      if (pending.attempts >= MAX_CODE_ATTEMPTS) {
        pendingSetups.delete(setupToken);
      }

      return res.status(401).json({
        success: false,
        message: "Invalid authenticator code.",
      });
    }

    if (await readStoredSecret()) {
      pendingSetups.delete(setupToken);

      return res.status(409).json({
        success: false,
        message: "An authenticator is already configured.",
      });
    }

    await saveSecretEncrypted(pending.secret);
    pendingSetups.delete(setupToken);

    return res.json({
      success: true,
      message: "Authenticator enabled. Sign in again with your password and code.",
    });
  } catch (error) {
    console.error("Authenticator activation failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not enable authenticator.",
    });
  }
});

// POST /api/admin/login/verify
// Only a valid TOTP code can turn a password challenge into a session.
router.post("/login/verify", async (req, res) => {
  try {
    const { challengeId, code } = req.body || {};

    if (typeof challengeId !== "string") {
      return res.status(401).json({
        success: false,
        message: "Login challenge is invalid or expired.",
      });
    }

    const challenge = pendingLogins.get(challengeId);

    if (!challenge || challenge.expiresAt <= Date.now()) {
      pendingLogins.delete(challengeId);

      return res.status(401).json({
        success: false,
        message: "Login challenge is invalid or expired. Sign in again.",
      });
    }

    if (challenge.attempts >= MAX_CODE_ATTEMPTS) {
      pendingLogins.delete(challengeId);

      return res.status(429).json({
        success: false,
        message: "Too many attempts. Sign in again.",
      });
    }

    challenge.attempts += 1;

    const secret = await readStoredSecret();

    if (!secret) {
      pendingLogins.delete(challengeId);

      return res.status(409).json({
        success: false,
        needsSetup: true,
        message: "Authenticator setup is required.",
      });
    }

    if (!(await verifyTotp(secret, code))) {
      if (challenge.attempts >= MAX_CODE_ATTEMPTS) {
        pendingLogins.delete(challengeId);
      }

      return res.status(401).json({
        success: false,
        message: "Invalid authenticator code.",
      });
    }

    // A challenge is single-use.
    pendingLogins.delete(challengeId);

    return createAdminSession(res);
  } catch (error) {
    console.error("Two-factor verification failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not verify authenticator code.",
    });
  }
});

function requireAdmin(req, res, next) {
  const authorization = req.headers.authorization || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";

  const expiresAt = sessions.get(token);

  if (!token || !expiresAt || expiresAt <= Date.now()) {
    sessions.delete(token);

    return res.status(401).json({
      success: false,
      message: "Please log in as an administrator.",
    });
  }

  next();
}

// All routes below this point require admin authentication.
// Keep all existing product and inventory routes below this line.
router.use(requireAdmin);


// GET /api/admin/products
router.get("/products", async (req, res) => {
  try {
    await db.read();

    return res.json({
      success: true,
      products: db.data.products || [],
    });
  } catch (error) {
    console.error("Admin product list failed:", error);
    return res.status(500).json({
      success: false,
      message: "Could not load products.",
    });
  }
});

function validateProduct(body) {
  const name = String(body.name || "").trim();
  const category = String(body.category || "").trim().toLowerCase();
  const gender = String(body.gender || "ALL").trim().toUpperCase();
  const originalPrice = Number(body.originalPrice);
  const discountPrice = Number(body.discountPrice);

  if (!name || name.length > 200) {
    return "Product name is required and must be under 200 characters.";
  }

  if (!["clothing", "footwear"].includes(category)) {
    return "Category must be clothing or footwear.";
  }

  if (!["MEN", "WOMEN", "KIDS", "ALL"].includes(gender)) {
    return "Select a valid gender.";
  }

  if (
    !Number.isFinite(originalPrice) ||
    !Number.isFinite(discountPrice) ||
    originalPrice < 0 ||
    discountPrice < 0 ||
    discountPrice > originalPrice
  ) {
    return "Enter valid prices. Sale price cannot exceed original price.";
  }

  for (const field of ["sizes", "colors"]) {
    if (
      body[field] !== undefined &&
      (!Array.isArray(body[field]) ||
        body[field].some((item) => typeof item !== "string"))
    ) {
      return `${field} must be a list of text values.`;
    }
  }

  if (
    body.stock !== undefined &&
    (!Number.isInteger(Number(body.stock)) || Number(body.stock) < 0)
  ) {
    return "Stock must be a non-negative whole number.";
  }

  if (
    body.image !== undefined &&
    (typeof body.image !== "string" || body.image.length > 2000)
  ) {
    return "Image must be a valid image URL or empty text.";
  }

  return null;
}

function makeProduct(body, existing = {}) {
  const originalPrice = Number(body.originalPrice);
  const discountPrice = Number(body.discountPrice);
  const discount = originalPrice > 0
    ? Math.round((1 - discountPrice / originalPrice) * 100)
    : 0;

  return {
    ...existing,
    name: String(body.name).trim(),
    category: String(body.category).trim().toLowerCase(),
    subCategory: String(body.subCategory || "").trim(),
    gender: String(body.gender || "ALL").trim().toUpperCase(),
    originalPrice,
    discountPrice,
    discountBadge: discount > 0 ? `${discount}% OFF` : "",
    sizes: body.sizes ?? existing.sizes ?? [],
    colors: body.colors ?? existing.colors ?? [],
    image: String(body.image ?? existing.image ?? "").trim(),
    description: String(body.description ?? existing.description ?? "").trim(),
    stock: body.stock === undefined
      ? (existing.stock ?? 0)
      : Number(body.stock),
    rating: existing.rating ?? 0,
    reviewsCount: existing.reviewsCount ?? 0,
  };
}

// POST /api/admin/products
router.post("/products", async (req, res) => {
  try {
    const error = validateProduct(req.body || {});
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    await db.read();
    db.data.products ||= [];

    const product = {
      id: `mp-${randomBytes(6).toString("hex")}`,
      ...makeProduct(req.body),
    };

    db.data.products.push(product);
    await db.write();

    return res.status(201).json({ success: true, product });
  } catch (error) {
    console.error("Admin create product failed:", error);
    return res.status(500).json({
      success: false,
      message: "Could not create product.",
    });
  }
});

// PUT /api/admin/products/:id
router.put("/products/:id", async (req, res) => {
  try {
    const error = validateProduct(req.body || {});
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    await db.read();
    const products = db.data.products || [];
    const index = products.findIndex(
      (item) => String(item.id) === String(req.params.id)
    );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    products[index] = makeProduct(req.body, products[index]);
    await db.write();

    return res.json({ success: true, product: products[index] });
  } catch (error) {
    console.error("Admin update product failed:", error);
    return res.status(500).json({
      success: false,
      message: "Could not update product.",
    });
  }
});

// DELETE /api/admin/products/:id
router.delete("/products/:id", async (req, res) => {
  try {
    await db.read();
    const products = db.data.products || [];
    const index = products.findIndex(
      (item) => String(item.id) === String(req.params.id)
    );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    products.splice(index, 1);
    await db.write();

    return res.json({ success: true, message: "Product deleted." });
  } catch (error) {
    console.error("Admin delete product failed:", error);
    return res.status(500).json({
      success: false,
      message: "Could not delete product.",
    });
  }
});

export default router;

const LOW_STOCK_THRESHOLD = 3;

// GET /api/admin/inventory/low-stock
router.get("/inventory/low-stock", async (req, res) => {
  try {
    await db.read();
    db.data.products ||= [];

    const lowStock = [];

    for (const product of db.data.products) {
      const variants = product.inventoryVariants || [];

      for (const variant of variants) {
        if (Number(variant.stock) <= LOW_STOCK_THRESHOLD) {
          lowStock.push({
            productId: product.id,
            productName: product.name,
            size: variant.size,
            color: variant.color,
            stock: Number(variant.stock),
          });
        }
      }
    }

    return res.json({ success: true, threshold: LOW_STOCK_THRESHOLD, items: lowStock });
  } catch (error) {
    console.error("Low-stock lookup failed:", error);
    return res.status(500).json({ success: false, message: "Could not load low-stock items." });
  }
});

// POST /api/admin/inventory/initialize/:id
// Body: { "variants": [{ "size": "M", "color": "Black", "stock": 10 }] }
router.post("/inventory/initialize/:id", async (req, res) => {
  try {
    const { variants } = req.body || {};

    if (!Array.isArray(variants) || variants.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one size, colour and stock quantity.",
      });
    }

    const seen = new Set();

    for (const variant of variants) {
      if (
        typeof variant.size !== "string" ||
        !variant.size.trim() ||
        typeof variant.color !== "string" ||
        !variant.color.trim() ||
        !Number.isInteger(variant.stock) ||
        variant.stock < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Every variant needs a size, colour and non-negative whole-number stock.",
        });
      }

      const key = `${variant.size.trim().toLowerCase()}::${variant.color.trim().toLowerCase()}`;
      if (seen.has(key)) {
        return res.status(400).json({
          success: false,
          message: "Duplicate size and colour combinations are not allowed.",
        });
      }
      seen.add(key);
    }

    await db.read();
    db.data.products ||= [];

    const product = db.data.products.find(
      (item) => String(item.id) === String(req.params.id)
    );

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }

    if (Array.isArray(product.inventoryVariants) && product.inventoryVariants.length) {
      return res.status(409).json({
        success: false,
        message: "Inventory is already initialized. Use stock adjustments instead.",
      });
    }

    product.inventoryVariants = variants.map((variant) => ({
      size: variant.size.trim(),
      color: variant.color.trim(),
      stock: variant.stock,
    }));

    product.stock = product.inventoryVariants.reduce((sum, variant) => sum + variant.stock, 0);

    db.data.stockAdjustments ||= [];
    db.data.stockAdjustments.push({
      id: randomBytes(8).toString("hex"),
      productId: product.id,
      type: "initialization",
      quantity: product.stock,
      reason: "Initial variant inventory setup",
      variants: product.inventoryVariants.map((variant) => ({ ...variant })),
      timestamp: new Date().toISOString(),
    });

    await db.write();
    return res.json({ success: true, product });
  } catch (error) {
    console.error("Inventory initialization failed:", error);
    return res.status(500).json({ success: false, message: "Could not initialize inventory." });
  }
});

// POST /api/admin/inventory/adjustments
// Body: { "productId":"mp-cl-1", "size":"M", "color":"Jet Black",
//         "type":"stock_in", "quantity":5, "reason":"Supplier delivery" }
router.post("/inventory/adjustments", async (req, res) => {
  try {
    const { productId, size, color, type, quantity, reason } = req.body || {};

    if (
      !productId ||
      typeof size !== "string" ||
      typeof color !== "string" ||
      !["stock_in", "stock_out", "correction"].includes(type) ||
      !Number.isInteger(quantity) ||
      quantity < 0 ||
      !String(reason || "").trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Provide productId, size, color, valid adjustment type, whole-number quantity and reason.",
      });
    }

    if (type !== "correction" && quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Stock-in and stock-out quantities must be at least 1.",
      });
    }

    await db.read();
    db.data.products ||= [];
    db.data.stockAdjustments ||= [];

    const product = db.data.products.find(
      (item) => String(item.id) === String(productId)
    );

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }

    const variants = product.inventoryVariants || [];
    const variant = variants.find(
      (item) => item.size.toLowerCase() === size.trim().toLowerCase() &&
                item.color.toLowerCase() === color.trim().toLowerCase()
    );

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Inventory variant not found. Initialize inventory first.",
      });
    }

    const previousStock = Number(variant.stock);
    let nextStock;

    if (type === "stock_in") nextStock = previousStock + quantity;
    else if (type === "stock_out") nextStock = previousStock - quantity;
    else nextStock = quantity;

    if (nextStock < 0) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Available quantity: ${previousStock}.`,
      });
    }

    variant.stock = nextStock;
    product.stock = variants.reduce((sum, item) => sum + Number(item.stock), 0);

    db.data.stockAdjustments.push({
      id: randomBytes(8).toString("hex"),
      productId: product.id,
      productName: product.name,
      size: variant.size,
      color: variant.color,
      type,
      quantity: type === "correction" ? nextStock - previousStock : quantity,
      previousStock,
      newStock: nextStock,
      reason: String(reason).trim().slice(0, 500),
      timestamp: new Date().toISOString(),
    });

    await db.write();

    return res.json({
      success: true,
      productId: product.id,
      variant: { size: variant.size, color: variant.color, stock: variant.stock },
      totalStock: product.stock,
    });
  } catch (error) {
    console.error("Inventory adjustment failed:", error);
    return res.status(500).json({ success: false, message: "Could not adjust stock." });
  }
});

// GET /api/admin/inventory/adjustments
router.get("/inventory/adjustments", async (req, res) => {
  try {
    await db.read();
    const adjustments = db.data.stockAdjustments || [];

    return res.json({
      success: true,
      adjustments: [...adjustments].reverse(),
    });
  } catch (error) {
    console.error("Inventory history lookup failed:", error);
    return res.status(500).json({ success: false, message: "Could not load inventory history." });
  }
});

