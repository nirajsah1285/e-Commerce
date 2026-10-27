
import { Router } from "express";
import pool from "./mysql.js";
import requireCustomerSession from "./customerSession.js";

const router = Router();

router.use(requireCustomerSession);

const clean = (value) => String(value ?? "").trim();

function validateAddress(body) {
  const fields = [
    "recipient_name",
    "phone",
    "province",
    "district",
    "municipality",
    "ward",
    "village_tole",
    "full_address",
  ];

  const address = {};

  for (const field of fields) {
    address[field] = clean(body[field]);
    if (!address[field]) {
      return { error: `${field.replaceAll("_", " ")} is required.` };
    }
  }

  const limits = {
    recipient_name: 150,
    phone: 20,
    province: 100,
    district: 100,
    municipality: 150,
    ward: 20,
    village_tole: 150,
    full_address: 500,
  };

  for (const [field, max] of Object.entries(limits)) {
    if (address[field].length > max) {
      return { error: `${field.replaceAll("_", " ")} is too long.` };
    }
  }

  const latValue = body.map_lat;
  const lngValue = body.map_lng;

  if (
    (latValue === null || latValue === undefined || latValue === "") !==
    (lngValue === null || lngValue === undefined || lngValue === "")
  ) {
    return { error: "Provide both map coordinates or leave both empty." };
  }

  let map_lat = null;
  let map_lng = null;

  if (latValue !== null && latValue !== undefined && latValue !== "") {
    map_lat = Number(latValue);
    map_lng = Number(lngValue);

    if (
      !Number.isFinite(map_lat) ||
      !Number.isFinite(map_lng) ||
      map_lat < -90 ||
      map_lat > 90 ||
      map_lng < -180 ||
      map_lng > 180
    ) {
      return { error: "The map coordinates are invalid." };
    }
  }

  return {
    address: { ...address, map_lat, map_lng },
  };
}

// List addresses belonging to the logged-in customer.
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, recipient_name, phone, province, district,
              municipality, ward, village_tole, full_address,
              map_lat, map_lng, is_default, created_at, updated_at
       FROM customer_addresses
       WHERE customer_id = ?
       ORDER BY is_default DESC, updated_at DESC, id DESC`,
      [req.customer.id]
    );

    return res.json({ success: true, addresses: rows });
  } catch (error) {
    console.error("List customer addresses failed:", error.message);
    return res.status(500).json({
      success: false,
      error: "Unable to load your addresses.",
    });
  }
});

// Add an address. The first address automatically becomes the default.
router.post("/", async (req, res) => {
  const result = validateAddress(req.body || {});

  if (result.error) {
    return res.status(400).json({ success: false, error: result.error });
  }

  const address = result.address;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [existing] = await connection.execute(
      "SELECT id FROM customer_addresses WHERE customer_id = ? FOR UPDATE",
      [req.customer.id]
    );

    const makeDefault =
      Boolean(req.body.is_default) || existing.length === 0;

    if (makeDefault) {
      await connection.execute(
        "UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?",
        [req.customer.id]
      );
    }

    const [insertResult] = await connection.execute(
      `INSERT INTO customer_addresses
       (customer_id, recipient_name, phone, province, district,
        municipality, ward, village_tole, full_address,
        map_lat, map_lng, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.customer.id,
        address.recipient_name,
        address.phone,
        address.province,
        address.district,
        address.municipality,
        address.ward,
        address.village_tole,
        address.full_address,
        address.map_lat,
        address.map_lng,
        makeDefault ? 1 : 0,
      ]
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Address saved successfully.",
      addressId: insertResult.insertId,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Add customer address failed:", error.message);

    return res.status(500).json({
      success: false,
      error: "Unable to save your address.",
    });
  } finally {
    connection.release();
  }
});

// Update an address owned by the logged-in customer.
router.put("/:id", async (req, res) => {
  const id = req.params.id;

  if (!/^\d+$/.test(id) || BigInt(id) < 1n) {
    return res.status(400).json({
      success: false,
      error: "Invalid address ID.",
    });
  }

  const result = validateAddress(req.body || {});

  if (result.error) {
    return res.status(400).json({ success: false, error: result.error });
  }

  const address = result.address;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT id, is_default
       FROM customer_addresses
       WHERE id = ? AND customer_id = ?
       FOR UPDATE`,
      [id, req.customer.id]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        error: "Address not found.",
      });
    }

    const makeDefault =
      Boolean(req.body.is_default) || Boolean(rows[0].is_default);

    if (makeDefault) {
      await connection.execute(
        "UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?",
        [req.customer.id]
      );
    }

    await connection.execute(
      `UPDATE customer_addresses
       SET recipient_name = ?, phone = ?, province = ?, district = ?,
           municipality = ?, ward = ?, village_tole = ?, full_address = ?,
           map_lat = ?, map_lng = ?, is_default = ?
       WHERE id = ? AND customer_id = ?`,
      [
        address.recipient_name,
        address.phone,
        address.province,
        address.district,
        address.municipality,
        address.ward,
        address.village_tole,
        address.full_address,
        address.map_lat,
        address.map_lng,
        makeDefault ? 1 : 0,
        id,
        req.customer.id,
      ]
    );

    await connection.commit();

    return res.json({
      success: true,
      message: "Address updated successfully.",
    });
  } catch (error) {
    await connection.rollback();
    console.error("Update customer address failed:", error.message);

    return res.status(500).json({
      success: false,
      error: "Unable to update your address.",
    });
  } finally {
    connection.release();
  }
});

// Set an owned address as the default.
router.patch("/:id/default", async (req, res) => {
  const id = req.params.id;

  if (!/^\d+$/.test(id) || BigInt(id) < 1n) {
    return res.status(400).json({
      success: false,
      error: "Invalid address ID.",
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT id FROM customer_addresses
       WHERE id = ? AND customer_id = ?
       FOR UPDATE`,
      [id, req.customer.id]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        error: "Address not found.",
      });
    }

    await connection.execute(
      "UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?",
      [req.customer.id]
    );

    await connection.execute(
      `UPDATE customer_addresses
       SET is_default = 1
       WHERE id = ? AND customer_id = ?`,
      [id, req.customer.id]
    );

    await connection.commit();

    return res.json({
      success: true,
      message: "Default address updated.",
    });
  } catch (error) {
    await connection.rollback();
    console.error("Set default address failed:", error.message);

    return res.status(500).json({
      success: false,
      error: "Unable to set the default address.",
    });
  } finally {
    connection.release();
  }
});

// Delete an owned address. If it was the default, promote another address.
router.delete("/:id", async (req, res) => {
  const id = req.params.id;

  if (!/^\d+$/.test(id) || BigInt(id) < 1n) {
    return res.status(400).json({
      success: false,
      error: "Invalid address ID.",
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT id, is_default FROM customer_addresses
       WHERE id = ? AND customer_id = ?
       FOR UPDATE`,
      [id, req.customer.id]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        error: "Address not found.",
      });
    }

    await connection.execute(
      "DELETE FROM customer_addresses WHERE id = ? AND customer_id = ?",
      [id, req.customer.id]
    );

    if (rows[0].is_default) {
      const [remaining] = await connection.execute(
        `SELECT id FROM customer_addresses
         WHERE customer_id = ?
         ORDER BY updated_at DESC, id DESC
         LIMIT 1`,
        [req.customer.id]
      );

      if (remaining.length > 0) {
        await connection.execute(
          "UPDATE customer_addresses SET is_default = 1 WHERE id = ? AND customer_id = ?",
          [remaining[0].id, req.customer.id]
        );
      }
    }

    await connection.commit();

    return res.json({
      success: true,
      message: "Address deleted successfully.",
    });
  } catch (error) {
    await connection.rollback();
    console.error("Delete customer address failed:", error.message);

    return res.status(500).json({
      success: false,
      error: "Unable to delete your address.",
    });
  } finally {
    connection.release();
  }
});

export default router;
