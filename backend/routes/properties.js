import express from "express";
import pool from "../db/pool.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/* =========================================================
   🏠 1️⃣ جلب العقارات الخاصة بالمستخدم الحالي
   ========================================================= */
router.get("/my", verifyToken, async (req, res) => {
  const { phone, activeRole, id: userId } = req.user;
  const client = await pool.connect();

  try {
    let query = "";
    let params = [];

    /* 👑 الأدمن يشاهد جميع العقارات */
    if (activeRole === "admin") {
      query = `
        SELECT 
          p.id, p.title_deed_no, p.property_type, p.property_usage,
          p.num_units, p.national_address, p.city, p.contract_id,
          o.name AS office_name
        FROM properties p
        LEFT JOIN offices o ON o.id = p.office_id
        ORDER BY p.id DESC;
      `;
    }

    /* 🏢 المكتب يشاهد فقط العقارات التابعة لمكتبه */
    else if (["office", "office_admin"].includes(activeRole)) {
      query = `
    SELECT 
      p.id, p.title_deed_no, p.property_type, p.property_usage,
      p.num_units, p.national_address, p.city, p.contract_id,
      o.name AS office_name
    FROM properties p
    JOIN offices o ON o.id = p.office_id
    WHERE p.office_id IN (
        SELECT office_id FROM office_users WHERE user_id = $1
    )
    OR o.owner_id = $1
    ORDER BY p.id DESC
  `;
      params = [userId];
    }

    /* 🏠 المالك يرى فقط العقارات الخاصة به */
    else if (activeRole === "owner" || activeRole === "مالك") {
      query = `
        SELECT DISTINCT 
          p.id, p.title_deed_no, p.property_type, p.property_usage,
          p.num_units, p.national_address, p.city, p.contract_id,
          o.name AS office_name
        FROM properties p
        JOIN contracts c ON c.property_id = p.id
        JOIN contract_parties cp ON cp.contract_id = c.id
        JOIN parties pr ON pr.id = cp.party_id
        LEFT JOIN offices o ON o.id = p.office_id
        WHERE LOWER(TRIM(cp.role)) IN ('lessor','مالك')
          AND REPLACE(REPLACE(pr.phone,'+966','0'),' ','') = REPLACE(REPLACE($1,'+966','0'),' ','')
        ORDER BY p.id DESC;
      `;
      params = [phone];
    }

    /* 👤 المستأجر يرى العقارات المرتبطة بعقوده */
    else if (activeRole === "tenant" || activeRole === "مستأجر") {
      query = `
        SELECT DISTINCT 
          p.id, p.title_deed_no, p.property_type, p.property_usage,
          p.num_units, p.national_address, p.city, p.contract_id,
          o.name AS office_name
        FROM properties p
        JOIN contracts c ON c.property_id = p.id
        JOIN contract_parties cp ON cp.contract_id = c.id
        JOIN parties pt ON pt.id = cp.party_id
        LEFT JOIN offices o ON o.id = p.office_id
        WHERE LOWER(TRIM(cp.role)) IN ('tenant','مستأجر')
          AND REPLACE(REPLACE(pt.phone,'+966','0'),' ','') = REPLACE(REPLACE($1,'+966','0'),' ','')
        ORDER BY p.id DESC;
      `;
      params = [phone];
    }

    /* 🚫 غير مصرح له */
    else {
      return res.status(403).json({
        success: false,
        message: "🚫 لا تملك صلاحية لعرض العقارات.",
      });
    }

    const { rows } = await client.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("❌ Error fetching user properties:", err);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحميل العقارات.",
      details: err.message,
    });
  } finally {
    client.release();
  }
});

/* =========================================================
   🏗️ 2️⃣ جلب تفاصيل العقار مع الوحدات والعقود التابعة له
   ========================================================= */
router.get("/:id", verifyToken, async (req, res) => {
  const { id: propertyId } = req.params;
  const { activeRole, id: userId, phone } = req.user;
  const client = await pool.connect();

  try {
    // =========================================================
    // 🏡 1️⃣ جلب بيانات العقار
    // =========================================================
    const propertyRes = await client.query(
      `
      SELECT 
        p.id,
        p.title_deed_no,
        p.property_type AS property_name,
        p.property_usage AS usage,
        p.num_units,
        p.national_address,
        p.city,
        p.office_id
      FROM properties p
      WHERE p.id = $1
      `,
      [propertyId]
    );

    if (!propertyRes.rowCount) {
      return res.status(404).json({
        success: false,
        message: "❌ لم يتم العثور على العقار المطلوب.",
      });
    }

    // =========================================================
    // 🔐 2️⃣ التحقق من صلاحيات عرض العقار
    // =========================================================
    let allowed = false;

    if (activeRole === "admin") {
      allowed = true;
    } 
    else if (["office", "office_admin"].includes(activeRole)) {
      const check = await client.query(
        `
    SELECT 1
    FROM properties p
    JOIN offices o ON o.id = p.office_id
    WHERE p.id = $1
      AND (
        p.office_id IN (SELECT office_id FROM office_users WHERE user_id = $2)
        OR o.owner_id = $2
      )
    LIMIT 1
        `,
        [propertyId, userId]
      );
      allowed = check.rowCount > 0;
    }
    else if (["owner","مالك"].includes(activeRole)) {
      const check = await client.query(
        `
        SELECT 1
        FROM contracts c
        JOIN contract_parties cp ON cp.contract_id = c.id
        JOIN parties pt ON pt.id = cp.party_id
        WHERE c.property_id = $1
          AND LOWER(TRIM(cp.role)) IN ('lessor','مالك')
          AND REPLACE(REPLACE(pt.phone,'+966','0'),' ','') =
              REPLACE(REPLACE($2,'+966','0'),' ','')
        LIMIT 1
        `,
        [propertyId, phone]
      );
      allowed = check.rowCount > 0;
    }
    else if (["tenant","مستأجر"].includes(activeRole)) {
      const check = await client.query(
        `
        SELECT 1
        FROM contracts c
        JOIN contract_parties cp ON cp.contract_id = c.id
        JOIN parties pt ON pt.id = cp.party_id
        WHERE c.property_id = $1
          AND LOWER(TRIM(cp.role)) IN ('tenant','مستأجر')
          AND REPLACE(REPLACE(pt.phone,'+966','0'),' ','') =
              REPLACE(REPLACE($2,'+966','0'),' ','')
        LIMIT 1
        `,
        [propertyId, phone]
      );
      allowed = check.rowCount > 0;
    }

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "🚫 لا تملك صلاحية لعرض هذا العقار.",
      });
    }

    // =========================================================
    // 🧱 3️⃣ جلب الوحدات المرتبطة بالعقار (نشطة + منتهية + شاغرة)
    // =========================================================
    const unitsRes = await client.query(
      `
      SELECT 
        u.id AS unit_id,
        u.unit_no,
        u.unit_type,
        u.unit_area,
        u.electric_meter_no,
        u.water_meter_no,
        c.id AS contract_id,
        c.tenancy_start,
        c.tenancy_end,
        CASE 
          WHEN c.id IS NULL THEN 'vacant'
          WHEN CURRENT_DATE BETWEEN c.tenancy_start AND c.tenancy_end THEN 'occupied'
          ELSE 'expired'
        END AS status
      FROM units u
      LEFT JOIN LATERAL (
          SELECT c.*
          FROM contract_units cu
          JOIN contracts c ON c.id = cu.contract_id
          WHERE cu.unit_id = u.id
          ORDER BY c.tenancy_start DESC
          LIMIT 1
      ) c ON TRUE
      WHERE u.property_id = $1
      ORDER BY u.unit_no::int NULLS LAST

      `,
      [propertyId]
    );

    // =========================================================
    // 🧾 4️⃣ جلب العقود المرتبطة بالعقار
    // =========================================================
    const contractsRes = await client.query(
      `
      SELECT 
        c.id,
        c.contract_no,
        c.tenancy_start,
        c.tenancy_end,
        c.annual_rent,
        o.name AS office_name,
        (
          SELECT pt.name
          FROM parties pt
          JOIN contract_parties cp ON cp.party_id = pt.id
          WHERE cp.contract_id = c.id
            AND LOWER(TRIM(cp.role)) IN ('tenant','مستأجر')
          LIMIT 1
        ) AS tenant_name,
        (
          SELECT pt.phone
          FROM parties pt
          JOIN contract_parties cp ON cp.party_id = pt.id
          WHERE cp.contract_id = c.id
            AND LOWER(TRIM(cp.role)) IN ('tenant','مستأجر')
          LIMIT 1
        ) AS tenant_phone,
        (
          SELECT pt.name
          FROM parties pt
          JOIN contract_parties cp ON cp.party_id = pt.id
          WHERE cp.contract_id = c.id
            AND LOWER(TRIM(cp.role)) IN ('lessor','مالك')
          LIMIT 1
        ) AS lessor_name,
        (
          SELECT pt.phone
          FROM parties pt
          JOIN contract_parties cp ON cp.party_id = pt.id
          WHERE cp.contract_id = c.id
            AND LOWER(TRIM(cp.role)) IN ('lessor','مالك')
          LIMIT 1
        ) AS lessor_phone,
        CASE 
          WHEN c.tenancy_end >= CURRENT_DATE THEN 'نشط'
          ELSE 'منتهي'
        END AS contract_status
      FROM contracts c
      LEFT JOIN offices o ON o.id = c.office_id
      WHERE c.property_id = $1
      ORDER BY c.tenancy_start DESC
      `,
      [propertyId]
    );

    // =========================================================
    // 🎯 5️⃣ النتيجة النهائية
    // =========================================================
    res.json({
      success: true,
      message: "تم جلب بيانات العقار بنجاح",
      data: {
        ...propertyRes.rows[0],
        units: unitsRes.rows,
        contracts: contractsRes.rows,
      },
    });
  } catch (err) {
    console.error("❌ Error fetching property details:", err);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحميل تفاصيل العقار.",
      details: err.message,
    });
  } finally {
    client.release();
  }
});




// ===========================
//  🏡 تحديث العقار
// ===========================
router.put("/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const {
    title_deed_no,
    property_name,
    usage,
    num_units,
    city,
    national_address
  } = req.body;

  try {
    const query = `
      UPDATE properties
      SET
        title_deed_no = $1,
        property_type = $2,
        property_usage = $3,
        num_units = $4,
        national_address = $5,
        city = $6,
        updated_at = NOW()
      WHERE id = $7
      RETURNING *;
    `;

    const values = [
      title_deed_no,
      property_name,
      usage,
      num_units,
      national_address,
      city,
      id,
    ];

    const { rows } = await pool.query(query, values);

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "❌ لم يتم العثور على العقار المطلوب.",
      });
    }

    res.json({
      success: true,
      message: "✅ تم تحديث العقار بنجاح.",
      data: rows[0],
    });
  } catch (err) {
    console.error("❌ Error updating property:", err);
    res.status(500).json({
      success: false,
      message: "فشل تحديث بيانات العقار",
      error: err.message,
    });
  }
});
// ============================================
// 📌 Property Full Summary (for reports)
// GET /properties/:id/summary
// ============================================
router.get("/:id/summary", verifyToken, async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    /* 1) Property Info */
    const propertyRes = await client.query(
      `SELECT * FROM properties WHERE id = $1`,
      [id]
    );

    if (propertyRes.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "❌ Property not found",
      });
    }

    const property = propertyRes.rows[0];

    /* 2) Units */
    const unitsRes = await client.query(
      `SELECT id, unit_no, unit_type, unit_area, electric_meter_no, water_meter_no 
       FROM units WHERE property_id = $1 
       ORDER BY unit_no::int`,
      [id]
    );

    /* 3) Contracts */
/* 3) Contracts */
    const contractsRes = await client.query(
      `
SELECT DISTINCT ON (c.id)
    c.id,
    c.contract_no,
    c.tenancy_start,
    c.tenancy_end,
    c.total_contract_value,
    c.annual_rent,

    CASE 
      WHEN c.tenancy_end >= NOW() THEN 'نشط'
      ELSE 'منتهي'
    END AS status,

    -- tenant only
    (
      SELECT pt.name 
      FROM contract_parties cp2
      JOIN parties pt ON pt.id = cp2.party_id
      WHERE cp2.contract_id = c.id 
        AND cp2.role IN ('tenant','مستأجر','مستاجر')
      LIMIT 1
    ) AS tenant_name

FROM contracts c
WHERE c.property_id = $1
ORDER BY c.id, c.tenancy_start DESC;
      `,
      [id]
    );


    /* 4) Expenses */
    const expensesRes = await client.query(
      `SELECT id, amount, date, notes, expense_type
       FROM expenses
       WHERE property_id = $1 or contract_id IN (SELECT id FROM contracts WHERE property_id = $1)
        or unit_id IN (SELECT id FROM units WHERE property_id = $1)
       ORDER BY date DESC`,
      [id]
    );

    /* 5) Receipts */
    const receiptsRes = await client.query(
      `SELECT id, receipt_type, amount, date
       FROM receipts
       WHERE contract_id IN (SELECT id FROM contracts WHERE property_id = $1)
        or property_id = $1
         or unit_id IN (SELECT id FROM units WHERE property_id = $1)
       ORDER BY date DESC`,
      [id]
    );

    /* ================================
       BUILD FINAL RESPONSE
    =================================*/
    return res.json({
      success: true,
      message: "📊 Property Summary Loaded",
      data: {
        property,
        units: unitsRes.rows,
        contracts: contractsRes.rows,
        expenses: expensesRes.rows,
        receipts: receiptsRes.rows,
      },
    });

  } catch (err) {
    console.error("❌ Error in /properties/:id/summary:", err);
    res.status(500).json({
      success: false,
      message: "Server error loading property summary",
    });
  } finally {
    client.release();
  }
});


// ============================================
// 📌 Get All Contracts for a Property (with units)
// GET /properties/:id/contracts
// ============================================

router.get("/:id/contracts", verifyToken, async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    // التحقق من وجود العقار
    const checkProperty = await client.query(
      `SELECT id FROM properties WHERE id = $1`,
      [id]
    );

    if (checkProperty.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "❌ Property not found",
      });
    }

    // جلب العقود مع الوحدة
    const contracts = await client.query(
      `
      SELECT DISTINCT ON (c.id)
        c.id,
        c.contract_no,
        c.tenancy_start,
        c.tenancy_end,
        c.total_contract_value,
        c.annual_rent,

        CASE 
          WHEN c.tenancy_end >= NOW() THEN 'نشط'
          ELSE 'منتهي'
        END AS status,

        -- المستأجر فقط
        (
          SELECT pt.name
          FROM contract_parties cp2
          JOIN parties pt ON pt.id = cp2.party_id
          WHERE cp2.contract_id = c.id 
            AND cp2.role IN ('tenant','مستأجر','مستاجر')
          LIMIT 1
        ) AS tenant_name,

        -- 🔥 الوحدة المرتبطة بالعقد
        u.id AS unit_id,
        u.unit_no,
        u.unit_type,
        u.unit_area

      FROM contracts c
      LEFT JOIN contract_units cu ON cu.contract_id = c.id
      LEFT JOIN units u ON u.id = cu.unit_id

      WHERE c.property_id = $1
      ORDER BY c.id, c.tenancy_start DESC;
      `,
      [id]
    );

    return res.json({
      success: true,
      data: contracts.rows,
    });

  } catch (err) {
    console.error("❌ Error loading property contracts:", err);
    return res.status(500).json({
      success: false,
      message: "Server error loading property contracts",
    });
  } finally {
    client.release();
  }
});

export default router;
