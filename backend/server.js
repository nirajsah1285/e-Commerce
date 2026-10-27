import cookieParser from "cookie-parser";
import customerAuthRouter from "./customerAuth.js";
import customerAddressesRouter from "./customerAddresses.js";
import adminRouter from "./admin.js";
import "dotenv/config";
import express from "express";
import cors from "cors";
import db from "./db.js";
import pool from "./mysql.js";
import { randomBytes } from "node:crypto";


const app = express();
const PORT = process.env.PORT || 5000;


app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5174",
    ],
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

app.use("/api/admin", adminRouter);
app.use("/api/customer-auth", customerAuthRouter);
app.use("/api/customer-addresses", customerAddressesRouter);
// --------------------------------------------------
// DELIVERY CONFIGURATION
// --------------------------------------------------

const DELIVERY_ZONES = [
  { district: "Parsa", towns: ["Birgunj"] },
  { district: "Bara", towns: ["Kalaiya"] },
  {
    district: "Rautahat",
    towns: ["Chandrapur", "Garuda", "Gaur"],
  },
  {
    district: "Mahottari",
    towns: ["Bardibas", "Gaushala", "Jaleshwar"],
  },
  {
    district: "Dhanusha",
    towns: ["Janakpurdham", "Dhalkebar"],
  },
  {
    district: "Siraha",
    towns: ["Lahan", "Siraha", "Golbazar", "Mirchaiya"],
  },
  { district: "Saptari", towns: ["Rajbiraj"] },
];

const DISTRICT_ALIASES = {
  sarlahi: "Sarlahi",
  parsa: "Parsa",
  bara: "Bara",
  rautahat: "Rautahat",
  mahottari: "Mahottari",
  dhanusha: "Dhanusha",
  siraha: "Siraha",
  saptari: "Saptari",
};

const TOWN_ALIASES = {
  chapur: "Chandrapur",
  janakpur: "Janakpurdham",
  jaleshwor: "Jaleshwar",
  jaleshwar: "Jaleshwar",
};

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function canonicalDistrict(value) {
  return DISTRICT_ALIASES[normalize(value)] || null;
}

function canonicalTown(value) {
  const key = normalize(value);
  return TOWN_ALIASES[key] || String(value ?? "").trim();
}

function findHomeDeliveryZone(district, municipality) {
  const districtKey = normalize(district);
  const townKey = normalize(canonicalTown(municipality));

  return DELIVERY_ZONES.find(
    (zone) =>
      normalize(zone.district) === districtKey &&
      zone.towns.some((town) => normalize(town) === townKey)
  );
}

function calculateDelivery(location = {}) {
  const {
    province,
    district,
    municipality,
    ward,
    villageTole,
    address,
    mapLocation,
  } = location;

  if (!province || !district || !municipality) {
    return {
      valid: false,
      message: "Province, district and municipality are required.",
    };
  }

  const districtName = canonicalDistrict(district);

  // Free home delivery throughout Sarlahi.
  if (districtName === "Sarlahi") {
    const canPlaceOrder = Boolean(
      String(address ?? "").trim() &&
      ward &&
      String(villageTole ?? "").trim()
    );

    return {
      valid: true,
      eligible: true,
      deliveryMethod: "HOME_DELIVERY",
      deliveryFee: 0,
      district: "Sarlahi",
      message: "Free home delivery in Sarlahi.",
      requiresFullAddress: true,
      requiresMapLocation: false,
      canPlaceOrder,
    };
  }

  // Rs. 40 home delivery in selected towns.
  const zone = findHomeDeliveryZone(district, municipality);

  if (zone) {
    const lat = Number(mapLocation?.lat);
    const lng = Number(mapLocation?.lng);

    const hasMapLocation =
      mapLocation &&
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180;

    return {
      valid: true,
      eligible: true,
      deliveryMethod: "HOME_DELIVERY",
      deliveryFee: 40,
      district: zone.district,
      municipality: canonicalTown(municipality),
      message: hasMapLocation
        ? "Rs. 40 home delivery is available in this selected town."
        : "Add your map location before placing the order.",
      requiresFullAddress: true,
      requiresMapLocation: true,
      canPlaceOrder: Boolean(
        hasMapLocation &&
        String(address ?? "").trim() &&
        ward &&
        String(villageTole ?? "").trim()
      ),
    };
  }

  // Other areas: branch pickup, pending verified branch setup.
  return {
    valid: true,
    eligible: true,
    deliveryMethod: "BRANCH_PICKUP",
    deliveryFee: 40,
    district: districtName || String(district).trim(),
    municipality: String(municipality).trim(),
    message:
      "Home delivery is not configured for this area. Branch pickup applies, but the pickup branch must be configured before ordering.",
    requiresFullAddress: false,
    requiresMapLocation: false,
    canPlaceOrder: false,
    pickupBranch: null,
    pickupBranchConfigured: false,
  };
}

// --------------------------------------------------
// ROOT / HEALTH CHECK
// --------------------------------------------------

app.get("/api/health/db", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT DATABASE() AS databaseName, 1 AS connected"
    );

    return res.json({
      success: true,
      message: "MySQL connection successful",
      database: rows[0].databaseName,
    });
  } catch (error) {
    console.error("MySQL health check failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "MySQL connection failed",
      details: error.message,
    });
  }
});

// --------------------------------------------------
// DELIVERY LOCATIONS
// --------------------------------------------------

app.get("/api/delivery/locations", (req, res) => {
  res.json({
    success: true,
    freeHomeDelivery: {
      district: "Sarlahi",
      fee: 0,
      coverage: "District-wide; exact address required",
    },
    selectedTownHomeDelivery: {
      fee: 40,
      mapLocationRequired: true,
      zones: DELIVERY_ZONES,
    },
    otherAreas: {
      method: "BRANCH_PICKUP",
      fee: 40,
      message:
        "Pickup branches need verified names and addresses before orders can be accepted.",
    },
  });
});

// --------------------------------------------------
// CALCULATE DELIVERY
// --------------------------------------------------

app.post("/api/delivery/calculate", (req, res) => {
  try {
    const result = calculateDelivery(req.body || {});

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        ...result,
      });
    }

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Delivery calculation failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to calculate delivery.",
    });
  }
});

// --------------------------------------------------
// PRODUCTS
// Product catalogue continues to use db.js / LowDB.
// --------------------------------------------------

app.get("/api/products", async (req, res) => {
  try {
    await db.read();

    const { category, gender, q } = req.query;
    let products = db.data?.products || [];

    if (category && category !== "all") {
      products = products.filter(
        (product) =>
          product.category?.toLowerCase() ===
          String(category).toLowerCase()
      );
    }

    if (gender && gender !== "ALL") {
      products = products.filter(
        (product) =>
          product.gender?.toUpperCase() ===
          String(gender).toUpperCase()
      );
    }

    if (q) {
      const query = String(q).toLowerCase();

      products = products.filter(
        (product) =>
          product.name?.toLowerCase().includes(query) ||
          product.subCategory?.toLowerCase().includes(query)
      );
    }

    return res.json({
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("Fetch products failed:", error);

    return res.status(500).json({
      error: "Failed to fetch products",
      details: error.message,
    });
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    await db.read();

    const products = db.data?.products || [];
    const product = products.find(
      (item) => String(item.id) === String(req.params.id)
    );

    if (!product) {
      return res.status(404).json({
        error: "Product not found",
      });
    }

    return res.json(product);
  } catch (error) {
    console.error("Fetch product failed:", error);

    return res.status(500).json({
      error: "Failed to fetch product",
      details: error.message,
    });
  }
});

// --------------------------------------------------
// COUPONS
// --------------------------------------------------

app.post("/api/coupons/validate", (req, res) => {
  const { code, subtotal } = req.body || {};

  if (!code) {
    return res.status(400).json({
      valid: false,
      message: "Coupon code is required",
    });
  }

  if (String(code).trim().toUpperCase() === "MANPASAND25") {
    const amount = Number(subtotal);

    if (!Number.isFinite(amount) || amount < 0) {
      return res.status(400).json({
        valid: false,
        message: "A valid subtotal is required.",
      });
    }

    const discount = Math.round(amount * 0.25 * 100) / 100;

    return res.json({
      valid: true,
      code: "MANPASAND25",
      discountAmount: discount,
      message: "25% discount applied successfully!",
    });
  }

  return res.status(400).json({
    valid: false,
    message: "Invalid promo code",
  });
});

// --------------------------------------------------
// PLACE ORDER - MYSQL
// Saves to orders and order_items in one transaction.
// --------------------------------------------------


app.post("/api/orders", async (req, res) => {
  let connection;
  let transactionStarted = false;

  try {
    const { customer, items, couponCode, paymentMethod } = req.body || {};

    if (!customer || typeof customer !== "object" || Array.isArray(customer)) {
      return res.status(400).json({ success: false, message: "Valid customer details are required." });
    }

    if (
      !customer.name?.trim() ||
      !customer.phone?.trim() ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({ success: false, message: "Customer name, phone and cart items are required." });
    }

    if (String(paymentMethod || "COD").toUpperCase() !== "COD") {
      return res.status(400).json({ success: false, message: "Only Cash on Delivery is available." });
    }

    // Recalculate delivery on the server. Never trust the browser's fee.
    const delivery = calculateDelivery({
      province: customer.province,
      district: customer.district,
      municipality: customer.municipality,
      ward: customer.ward,
      villageTole: customer.villageTole,
      address: customer.address,
      mapLocation: customer.mapLocation,
    });

    if (!delivery.valid || !delivery.canPlaceOrder) {
      return res.status(400).json({
        success: false,
        message: delivery.message || "This delivery address is not currently eligible for ordering.",
      });
    }

    // Current configured coverage is Madhesh Province only.
    if (customer.province !== "Madhesh Province") {
      return res.status(400).json({
        success: false,
        message: "Ordering is not enabled for this province yet.",
      });
    }

    // Load authoritative product prices from the existing catalogue.
    await db.read();
    const catalogue = db.data?.products || [];

    const normalizedItems = items.map((item) => {
      const productId = String(item.id ?? item.productId ?? item.product_id ?? "");
      const quantity = Number(item.quantity);

      if (!productId || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
        throw new Error("Each cart item must have a valid product and quantity from 1 to 20.");
      }

      const product = catalogue.find((p) => String(p.id) === productId);

      if (!product || !Number.isFinite(Number(product.discountPrice)) || Number(product.discountPrice) < 0) {
        throw new Error(`Product ${productId} is unavailable or has an invalid price.`);
      }

      const unitPrice = Number(product.discountPrice);

      return {
        productId,
        productName: product.name,
        quantity,
        unitPrice,
        itemData: JSON.stringify({
          productId,
          productName: product.name,
          quantity,
          unitPrice,
          selectedSize: item.selectedSize ?? null,
          selectedColor: item.selectedColor ?? null,
        }),
      };
    });

    const subtotal = Math.round(
      normalizedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) * 100
    ) / 100;

    // Validate and calculate the coupon on the server.
    let verifiedCouponDiscount = 0;
    const normalizedCoupon = String(couponCode || "").trim().toUpperCase();

    if (normalizedCoupon) {
      if (normalizedCoupon !== "MANPASAND25") {
        return res.status(400).json({ success: false, message: "Invalid coupon code." });
      }

      verifiedCouponDiscount = Math.round(subtotal * 0.25 * 100) / 100;
    }

    const deliveryFee = Number(delivery.deliveryFee);
    const total = Math.round(
      Math.max(0, subtotal - verifiedCouponDiscount + deliveryFee) * 100
    ) / 100;

    if (!Number.isFinite(total) || total <= 0) {
      return res.status(400).json({ success: false, message: "The order total is invalid." });
    }

    const orderId =
      "MP-" +
      Date.now().toString(36).toUpperCase() +
      randomBytes(3).toString("hex").toUpperCase();

    const customerForOrder = {
      name: String(customer.name).trim(),
      phone: String(customer.phone).trim(),
      province: customer.province,
      district: delivery.district || customer.district,
      municipality: delivery.municipality || customer.municipality,
      ward: String(customer.ward || "").trim(),
      villageTole: String(customer.villageTole || "").trim(),
      address: String(customer.address || "").trim(),
      mapLocation: customer.mapLocation || null,
      deliveryMethod: delivery.deliveryMethod,
      deliveryFee,
      couponCode: normalizedCoupon || null,
      couponDiscount: verifiedCouponDiscount,
      subtotal,
    };

    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    await connection.execute(
      `INSERT INTO orders
       (order_id, customer, total_amount, payment_method, status)
       VALUES (?, ?, ?, ?, ?)`,
      [
        orderId,
        JSON.stringify(customerForOrder),
        total,
        "COD",
        "CONFIRMED",
      ]
    );

    for (const item of normalizedItems) {
      await connection.execute(
        `INSERT INTO order_items
         (order_id, product_id, product_name, quantity, unit_price, item_data)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          item.productId,
          item.productName,
          item.quantity,
          item.unitPrice,
          item.itemData,
        ]
      );
    }

    await connection.commit();
    transactionStarted = false;

    console.log(`[MYSQL] Order ${orderId} saved. Total: Rs. ${total}`);

    return res.status(201).json({
      success: true,
      orderId,
      message: "Order placed successfully.",
      order: {
        orderId,
        customer: customerForOrder,
        items: normalizedItems.map(({ itemData, ...item }) => item),
        subtotal,
        couponDiscount: verifiedCouponDiscount,
        deliveryFee,
        totalAmount: total,
        paymentMethod: "COD",
        status: "CONFIRMED",
      },
    });
  } catch (error) {
    if (connection && transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Order rollback failed:", rollbackError.message);
      }
    }

    console.error("Order save failed:", error.message);

    const clientError =
      error.message.startsWith("Each cart item") ||
      error.message.startsWith("Product ");

    return res.status(clientError ? 400 : 500).json({
      success: false,
      message: clientError ? error.message : "Failed to save the order.",
    });
  } finally {
    if (connection) connection.release();
  }
});

// --------------------------------------------------
// GET ORDER DETAILS BY ORDER ID
// Example: GET /api/orders/MP-ABC123
// --------------------------------------------------

app.get("/api/orders/:orderId", async (req, res) => {
  let connection;

  try {
    const { orderId } = req.params;

    connection = await pool.getConnection();

    const [orders] = await connection.execute(
      `SELECT
         order_id,
         customer,
         total_amount,
         payment_method,
         status,
         created_at
       FROM orders
       WHERE order_id = ?
       LIMIT 1`,
      [orderId]
    );

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }

    const [items] = await connection.execute(
      `SELECT
         product_id,
         product_name,
         quantity,
         unit_price,
         item_data
       FROM order_items
       WHERE order_id = ?`,
      [orderId]
    );

    const order = orders[0];

    return res.json({
      success: true,
      order: {
        orderId: order.order_id,
        customer: order.customer,
        totalAmount: Number(order.total_amount),
        paymentMethod: order.payment_method,
        status: order.status,
        createdAt: order.created_at,
        items: items.map((item) => ({
          productId: item.product_id,
          productName: item.product_name,
          quantity: item.quantity,
          unitPrice: Number(item.unit_price),
          itemData: item.item_data,
        })),
      },
    });
  } catch (error) {
    console.error("Fetch order failed:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to fetch order",
      ...(process.env.NODE_ENV !== "production"
        ? { details: error.message }
        : {}),
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// --------------------------------------------------
// START SERVER
// --------------------------------------------------

app.listen(PORT, () => {
  console.log(
    `MANPASAND backend running at http://localhost:${PORT}`
  );
});
