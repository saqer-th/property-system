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
          p.num_units, p.national_address, p.property_name, p.contract_id,
          o.name AS office_name
        FROM properties p
        LEFT JOIN offices o ON o.id = p.office_id
        ORDER BY p.id DESC;
      `;
    }

    /* 🏢 المكتب يشاهد فقط العقارات التابعة لمكتبه */
    else if (["office", "office_admin"].includes(activeRole)) {
      query = `
    SELECT DISTINCT ON (p.id)
      p.id, p.title_deed_no, p.property_type, p.property_usage,
      p.num_units, p.national_address, p.property_name,
      o.name AS office_name
    FROM properties p
    LEFT JOIN contracts c ON c.property_id = p.id
    LEFT JOIN offices o ON o.id = c.office_id
    WHERE 
      c.office_id IN (
        SELECT office_id FROM office_users WHERE user_id = $1
      )
      OR o.owner_id = $1
    ORDER BY p.id DESC;
  `;
      params = [userId];
    }

    /* 🏠 المالك يرى فقط العقارات الخاصة به */
    else if (activeRole === "owner" || activeRole === "مالك") {
      query = `
        SELECT DISTINCT 
          p.id, p.title_deed_no, p.property_type, p.property_usage,
          p.num_units, p.national_address, p.property_name, p.contract_id,
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
          p.num_units, p.national_address, p.property_name, p.contract_id,
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
  const { id } = req.params;
  const { activeRole, id: userId, phone } = req.user;
  const client = await pool.connect();

  try {
    // ✅ جلب بيانات العقار
    const propertyRes = await client.query(
      `
      SELECT 
        p.id, p.title_deed_no, p.property_type, p.property_usage,
        p.num_units, p.national_address, p.property_name
      FROM properties p
      WHERE p.id = $1;
      `,
      [id]
    );

    if (propertyRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "❌ لم يتم العثور على العقار المطلوب.",
      });
    }

    let allowed = false;

    // ✅ الأدمن يشوف كل شيء
    if (activeRole === "admin") {
      allowed = true;
    }

    // ✅ المكتب يشوف فقط العقارات اللي فيها عقد تابع له
    else if (["office", "office_admin"].includes(activeRole)) {
      const check = await client.query(
         `
    SELECT 1
    FROM contracts c
    WHERE c.property_id = $1 
    AND (
      c.office_id IN (SELECT id FROM offices WHERE owner_id = $2)
      OR c.office_id IN (SELECT office_id FROM office_users WHERE user_id = $2)
    )
    LIMIT 1;
    `,
        [id, userId]
      );
      allowed = check.rowCount > 0;
    }

    // ✅ المالك يشوف فقط العقارات اللي له فيها عقد كمؤجر
    else if (["owner", "مالك"].includes(activeRole)) {
      const check = await client.query(
        `
        SELECT 1
        FROM contracts c
        JOIN contract_parties cp ON cp.contract_id = c.id
        JOIN parties p ON p.id = cp.party_id
        WHERE c.property_id = $1
          AND LOWER(TRIM(cp.role)) IN ('lessor','مالك')
          AND REPLACE(REPLACE(p.phone,'+966','0'),' ','') = REPLACE(REPLACE($2,'+966','0'),' ','')
        LIMIT 1;
        `,
        [id, phone]
      );
      allowed = check.rowCount > 0;
    }

    // ✅ المستأجر يشوف فقط العقارات اللي له فيها عقد كمستأجر
    else if (["tenant", "مستأجر"].includes(activeRole)) {
      const check = await client.query(
        `
        SELECT 1
        FROM contracts c
        JOIN contract_parties cp ON cp.contract_id = c.id
        JOIN parties p ON p.id = cp.party_id
        WHERE c.property_id = $1
          AND LOWER(TRIM(cp.role)) IN ('tenant','مستأجر')
          AND REPLACE(REPLACE(p.phone,'+966','0'),' ','') = REPLACE(REPLACE($2,'+966','0'),' ','')
        LIMIT 1;
        `,
        [id, phone]
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
    // 🏢 الوحدات المرتبطة بالعقود التابعة فقط للمكتب أو المستخدم
    // =========================================================
    let unitsQuery = `
  SELECT 
    u.id, u.unit_no, u.unit_type, u.unit_area,
    u.electric_meter_no, u.water_meter_no, u.status
  FROM units u
  JOIN contracts c ON c.id = u.contract_id
  WHERE c.property_id = $1
    `;

    const params = [id];

    // فقط الوحدات التابعة لعقود المكتب
    if (["office", "office_admin"].includes(activeRole)) {
      unitsQuery += `
    AND c.office_id IN (
      SELECT id FROM offices WHERE owner_id = $2
      UNION
      SELECT office_id FROM office_users WHERE user_id = $2
    )
  `;
      params.push(userId);
    }

    // فقط الوحدات التابعة لعقود المالك أو المستأجر
    else if (["owner", "مالك"].includes(activeRole)) {
      unitsQuery += `
        AND c.id IN (
          SELECT cp.contract_id
          FROM contract_parties cp
          JOIN parties p ON p.id = cp.party_id
          WHERE LOWER(TRIM(cp.role)) IN ('lessor','مالك')
          AND REPLACE(REPLACE(p.phone,'+966','0'),' ','') = REPLACE(REPLACE($2,'+966','0'),' ','')
        )
      `;
      params.push(phone);
    } else if (["tenant", "مستأجر"].includes(activeRole)) {
      unitsQuery += `
        AND c.id IN (
          SELECT cp.contract_id
          FROM contract_parties cp
          JOIN parties p ON p.id = cp.party_id
          WHERE LOWER(TRIM(cp.role)) IN ('tenant','مستأجر')
          AND REPLACE(REPLACE(p.phone,'+966','0'),' ','') = REPLACE(REPLACE($2,'+966','0'),' ','')
        )
      `;
      params.push(phone);
    }

    unitsQuery += " ORDER BY u.unit_no;";
    const unitsRes = await client.query(unitsQuery, params);

    // =========================================================
    // 📜 العقود التابعة للعقار (حسب الصلاحية)
    // =========================================================
    let contractsQuery = `
      SELECT 
        c.id, c.contract_no, c.tenancy_start, c.tenancy_end, c.annual_rent,
        o.name AS office_name,
        (SELECT name FROM parties pt
         JOIN contract_parties cp ON cp.party_id = pt.id
         WHERE cp.contract_id = c.id AND LOWER(TRIM(cp.role)) IN ('tenant','مستأجر') LIMIT 1) AS tenant_name,
        (SELECT phone FROM parties pt
         JOIN contract_parties cp ON cp.party_id = pt.id
         WHERE cp.contract_id = c.id AND LOWER(TRIM(cp.role)) IN ('tenant','مستأجر') LIMIT 1) AS tenant_phone,
        (SELECT name FROM parties pl
         JOIN contract_parties cp ON cp.party_id = pl.id
         WHERE cp.contract_id = c.id AND LOWER(TRIM(cp.role)) IN ('lessor','مالك') LIMIT 1) AS lessor_name,
        (SELECT phone FROM parties pl
         JOIN contract_parties cp ON cp.party_id = pl.id
         WHERE cp.contract_id = c.id AND LOWER(TRIM(cp.role)) IN ('lessor','مالك') LIMIT 1) AS lessor_phone,
        CASE 
          WHEN c.tenancy_end IS NULL THEN 'نشط'
          WHEN c.tenancy_end >= CURRENT_DATE THEN 'نشط'
          ELSE 'منتهي'
        END AS contract_status
      FROM contracts c
      LEFT JOIN offices o ON o.id = c.office_id
      WHERE c.property_id = $1
    `;

    const contractParams = [id];

    if (["office", "office_admin"].includes(activeRole)) {
      contractsQuery += `
    AND (
      c.office_id IN (SELECT office_id FROM office_users WHERE user_id = $2)
      OR c.office_id IN (SELECT id FROM offices WHERE owner_id = $2)
    )
  `;
      contractParams.push(userId);
    } else if (["owner", "مالك"].includes(activeRole)) {
      contractsQuery += `
        AND c.id IN (
          SELECT cp.contract_id
          FROM contract_parties cp
          JOIN parties p ON p.id = cp.party_id
          WHERE LOWER(TRIM(cp.role)) IN ('lessor','مالك')
          AND REPLACE(REPLACE(p.phone,'+966','0'),' ','') = REPLACE(REPLACE($2,'+966','0'),' ','')
        )
      `;
      contractParams.push(phone);
    } else if (["tenant", "مستأجر"].includes(activeRole)) {
      contractsQuery += `
        AND c.id IN (
          SELECT cp.contract_id
          FROM contract_parties cp
          JOIN parties p ON p.id = cp.party_id
          WHERE LOWER(TRIM(cp.role)) IN ('tenant','مستأجر')
          AND REPLACE(REPLACE(p.phone,'+966','0'),' ','') = REPLACE(REPLACE($2,'+966','0'),' ','')
        )
      `;
      contractParams.push(phone);
    }

    contractsQuery += " ORDER BY c.tenancy_start DESC;";
    const contractsRes = await client.query(contractsQuery, contractParams);

    // =========================================================
    // ✅ الإرجاع النهائي
    // =========================================================
    res.json({
      success: true,
      message: "✅ تم جلب تفاصيل العقار بنجاح.",
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

/* =========================================================
 🏢 تحديث بيانات العقار
========================================================= */
router.put("/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { title_deed_no, property_type, property_usage, num_units, national_address } = req.body;

  try {
    const query = `
      UPDATE properties
      SET
        title_deed_no = $1,
        property_type = $2,
        property_usage = $3,
        num_units = $4,
        national_address = $5,
        updated_at = NOW()
      WHERE id = $6
      RETURNING *;
    `;
    const values = [title_deed_no, property_type, property_usage, num_units, national_address, id];
    const { rows } = await pool.query(query, values);

    if (!rows.length)
      return res.status(404).json({ success: false, message: "لم يتم العثور على العقار" });

    res.json({
      success: true,
      message: "✅ تم تحديث بيانات العقار بنجاح",
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


export default router;
