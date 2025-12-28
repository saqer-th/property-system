import express from "express";
import pool from "../db/pool.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/* =========================================================
   🏘️ 1️⃣ جلب الوحدات الخاصة بالمستخدم الحالي
   ========================================================= */
router.get("/my", verifyToken, async (req, res) => {
  const { phone, activeRole, id: userId } = req.user;
  const client = await pool.connect();

  try {
    let query = "";
    let params = [];

    /* ----------------------------------------------------
       🟩 1) أدمن → يشاهد كل الوحدات + العقود المرتبطة بها
    ---------------------------------------------------- */
    if (activeRole === "admin") {
      query = `
        SELECT 
          u.id, u.unit_no, u.unit_type, u.unit_area,
          p.id AS property_id, p.property_type, p.property_usage, p.title_deed_no,
          COALESCE(
            ARRAY(
              SELECT cu.contract_id 
              FROM contract_units cu 
              WHERE cu.unit_id = u.id
              ORDER BY cu.start_date DESC
            ), '{}'
          ) AS contract_ids
        FROM units u
        LEFT JOIN properties p ON p.id = u.property_id
        ORDER BY p.id, u.unit_no;
      `;
    }

    /* ----------------------------------------------------
       🟦 2) مكتب → يرى الوحدات التي مرت بعقود مكتبه
    ---------------------------------------------------- */
    else if (["office", "office_admin"].includes(activeRole)) {
      query = `
        SELECT DISTINCT
          u.id, u.unit_no, u.unit_type, u.unit_area,
          p.id AS property_id, p.property_type, p.property_usage, p.title_deed_no
        FROM units u
        JOIN properties p ON p.id = u.property_id
        LEFT JOIN contract_units cu ON cu.unit_id = u.id
        LEFT JOIN contracts c ON c.id = cu.contract_id
        WHERE 
          -- 🔹 الوحدات التابعة لعقارات المكتب
          p.office_id IN (
            SELECT office_id FROM office_users WHERE user_id = $1
            UNION
            SELECT id FROM offices WHERE owner_id = $1 AND is_owner_office = false
          )
          OR
          -- 🔹 الوحدات التي مرت بعقود المكتب
          c.office_id IN (
            SELECT office_id FROM office_users WHERE user_id = $1
            UNION
            SELECT id FROM offices WHERE owner_id = $1 AND is_owner_office = false
          )
        ORDER BY p.id, u.unit_no;
      `;
      params = [userId];
    }
    /* ----------------------------------------------------
      🟪 3) مدير مكتب خاص (self_office_admin)
      ---------------------------------------------------- */
    else if (["self_office_admin"].includes(activeRole)) {
      query = `
        SELECT DISTINCT
          u.id, u.unit_no, u.unit_type, u.unit_area,
          p.id AS property_id, p.property_type, p.property_usage, p.title_deed_no
        FROM units u
        LEFT JOIN properties p ON p.id = u.property_id
        LEFT JOIN contract_units cu ON cu.unit_id = u.id
        LEFT JOIN contracts c ON c.id = cu.contract_id
        WHERE 
          (
            -- 🔹 وحدات تابعة لمكتبه الخاص
            p.office_id IN (
              SELECT id FROM offices 
              WHERE owner_id = $1 AND is_owner_office = true
            )
            OR
            -- 🔹 وحدات لها عقود تخصه كمؤجر
            c.id IN (
              SELECT cp.contract_id
              FROM contract_parties cp
              JOIN parties pr ON pr.id = cp.party_id
              WHERE LOWER(TRIM(cp.role)) IN ('lessor','مالك')
                AND REPLACE(REPLACE(pr.phone,'+966','0'),' ','') = 
                    REPLACE(REPLACE($2,'+966','0'),' ','')
            )
          )
        ORDER BY p.id, u.unit_no;
      `;
      params = [userId, phone];
    }

    /* ----------------------------------------------------
       🟨 3) مالك → يرى وحداته التي عليها أي عقد كمؤجر
    ---------------------------------------------------- */
    else if (["owner", "مالك"].includes(activeRole)) {
      query = `
        SELECT DISTINCT
          u.id, u.unit_no, u.unit_type, u.unit_area,
          p.id AS property_id, p.property_type, p.property_usage, p.title_deed_no
        FROM units u
        JOIN contract_units cu ON cu.unit_id = u.id
        JOIN contracts c ON c.id = cu.contract_id
        JOIN contract_parties cp ON cp.contract_id = c.id
        JOIN parties pr ON pr.id = cp.party_id
        LEFT JOIN properties p ON p.id = u.property_id
        WHERE LOWER(TRIM(cp.role)) IN ('lessor','مالك')
          AND REPLACE(REPLACE(pr.phone,'+966','0'),' ','') = REPLACE(REPLACE($1,'+966','0'),' ','')
        ORDER BY p.id, u.unit_no;
      `;
      params = [phone];
    }

    /* ----------------------------------------------------
       🟧 4) مستأجر → يرى الوحدات التي استأجرها
    ---------------------------------------------------- */
    else if (["tenant", "مستأجر"].includes(activeRole)) {
      query = `
        SELECT DISTINCT
          u.id, u.unit_no, u.unit_type, u.unit_area,
          p.id AS property_id, p.property_type, p.property_usage, p.title_deed_no
        FROM units u
        JOIN contract_units cu ON cu.unit_id = u.id
        JOIN contracts c ON c.id = cu.contract_id
        JOIN contract_parties cp ON cp.contract_id = c.id
        JOIN parties t ON t.id = cp.party_id
        LEFT JOIN properties p ON p.id = u.property_id
        WHERE LOWER(TRIM(cp.role)) IN ('tenant','مستأجر')
          AND REPLACE(REPLACE(t.phone,'+966','0'),' ','') = REPLACE(REPLACE($1,'+966','0'),' ','')
        ORDER BY p.id, u.unit_no;
      `;
      params = [phone];
    }

    /* ----------------------------------------------------
       🚫 5) صلاحية غير معروفة
    ---------------------------------------------------- */
    else {
      return res.status(403).json({
        success: false,
        message: "🚫 لا تملك صلاحية للوصول إلى البيانات",
      });
    }

    /* 🔍 تنفيذ الاستعلام */
    const { rows } = await client.query(query, params);

    res.json({
      success: true,
      total: rows.length,
      message: "✅ تم جلب الوحدات بنجاح",
      data: rows,
    });

  } catch (err) {
    console.error("❌ Error fetching my units:", err);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحميل الوحدات",
      details: err.message,
    });
  } finally {
    client.release();
  }
});


/* =========================================================
   🏗️ جلب تفاصيل وحدة معينة (تشمل العقود والمصروفات)
   ========================================================= */
router.get("/:id", verifyToken, async (req, res) => {
  const { id: unitId } = req.params;
  const { activeRole, id: userId, phone } = req.user;
  const client = await pool.connect();

  try {
    /* --------------------------------------------------------
       1️⃣ جلب بيانات الوحدة
    -------------------------------------------------------- */
    const unitRes = await client.query(
      `
      SELECT 
        u.*,
        p.title_deed_no,
        p.property_type,
        p.property_usage,
        p.national_address,
        p.num_units
      FROM units u
      LEFT JOIN properties p ON p.id = u.property_id
      WHERE u.id = $1
      `,
      [unitId]
    );

    if (unitRes.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "❌ الوحدة غير موجودة.",
      });
    }

    const unit = unitRes.rows[0];

    /* --------------------------------------------------------
       2️⃣ جلب كل العقود المرتبطة بالوحدة من contract_units
    -------------------------------------------------------- */
    const contractsRes = await client.query(
      `
      SELECT 
        c.id,
        c.contract_no,
        c.tenancy_start,
        c.tenancy_end,
        c.total_contract_value,
        o.name AS office_name,
        CASE 
          WHEN CURRENT_DATE BETWEEN c.tenancy_start AND c.tenancy_end
          THEN 'نشط'
          ELSE 'منتهي'
        END AS contract_status
      FROM contract_units cu
      JOIN contracts c ON c.id = cu.contract_id
      LEFT JOIN offices o ON o.id = c.office_id
      WHERE cu.unit_id = $1
      ORDER BY c.tenancy_start DESC
      `,
      [unitId]
    );

    /* --------------------------------------------------------
       3️⃣ جلب المستأجر لكل عقد
    -------------------------------------------------------- */
    const contractsWithTenant = [];

    for (const c of contractsRes.rows) {
      const tenantRes = await client.query(
        `
        SELECT pt.name, pt.phone
        FROM contract_parties cp
        JOIN parties pt ON pt.id = cp.party_id
        WHERE cp.contract_id = $1
          AND LOWER(TRIM(cp.role)) IN ('tenant','مستأجر')
        LIMIT 1
        `,
        [c.id]
      );

      contractsWithTenant.push({
        ...c,
        tenant_name: tenantRes.rows[0]?.name || null,
        tenant_phone: tenantRes.rows[0]?.phone || null,
      });
    }

    /* --------------------------------------------------------
       4️⃣ العقد النشط الحالي (إن وجد)
    -------------------------------------------------------- */
    const activeContract = contractsWithTenant.find(
      (c) =>
        c.tenancy_start &&
        c.tenancy_end &&
        new Date() >= new Date(c.tenancy_start) &&
        new Date() <= new Date(c.tenancy_end)
    );
    const unit_status = activeContract ? "occupied" : "vacant";

    /* --------------------------------------------------------
       5️⃣ التحقق من الصلاحيات
    -------------------------------------------------------- */
    let allowed = false;

    if (activeRole === "admin") allowed = true;

    else if (["office", "office_admin"].includes(activeRole)) {
      const officeCheck = await client.query(
        `
        SELECT 1
        FROM contract_units cu
        JOIN contracts c ON c.id = cu.contract_id
        WHERE cu.unit_id = $1
          AND (
            c.office_id IN (SELECT id FROM offices WHERE owner_id = $2 )
            OR c.office_id IN (SELECT office_id FROM office_users WHERE user_id = $2)
          )
        LIMIT 1
        `,
        [unitId, userId]
      );
      allowed = officeCheck.rowCount > 0;
    }
    else if (activeRole === "self_office_admin") {
      const selfCheck = await client.query(
        `
          SELECT 1
          FROM units u
          JOIN properties p ON p.id = u.property_id
          JOIN offices o ON o.id = p.office_id
          WHERE u.id = $1
            AND (
              -- 🟣 حالة 1: الوحدة تتبع مكتب المالك الخاص
              (o.owner_id = $2 AND o.is_owner_office = true)

              OR

              -- 🟣 حالة 2: الوحدة لها عقد والمستخدم هو المؤجّر
              u.id IN (
                SELECT cu.unit_id
                FROM contract_units cu
                JOIN contracts c ON c.id = cu.contract_id
                JOIN contract_parties cp ON cp.contract_id = c.id
                JOIN parties pr ON pr.id = cp.party_id
                WHERE LOWER(TRIM(cp.role)) IN ('lessor','مالك')
                  AND REPLACE(REPLACE(pr.phone,'+966','0'),' ','') =
                      REPLACE(REPLACE($3,'+966','0'),' ','')
              )
            )
          LIMIT 1
        `,
        [unitId, userId, phone]
      );

      allowed = selfCheck.rowCount > 0;
    }

    else if (["owner", "مالك"].includes(activeRole)) {
      const ownerCheck = await client.query(
        `
        SELECT 1
        FROM contract_units cu
        JOIN contracts c ON c.id = cu.contract_id
        JOIN contract_parties cp ON cp.contract_id = c.id
        JOIN parties pt ON pt.id = cp.party_id
        WHERE cu.unit_id = $1
          AND LOWER(TRIM(cp.role)) IN ('lessor','مالك')
          AND REPLACE(REPLACE(pt.phone,'+966','0'),' ','') = REPLACE(REPLACE($2,'+966','0'),' ','')
        LIMIT 1
        `,
        [unitId, phone]
      );
      allowed = ownerCheck.rowCount > 0;
    }

    else if (["tenant", "مستأجر"].includes(activeRole)) {
      const tenantCheck = await client.query(
        `
        SELECT 1
        FROM contract_units cu
        JOIN contracts c ON c.id = cu.contract_id
        JOIN contract_parties cp ON cp.contract_id = c.id
        JOIN parties pt ON pt.id = cp.party_id
        WHERE cu.unit_id = $1
          AND LOWER(TRIM(cp.role)) IN ('tenant','مستأجر')
          AND REPLACE(REPLACE(pt.phone,'+966','0'),' ','') = REPLACE(REPLACE($2,'+966','0'),' ','')
        LIMIT 1
        `,
        [unitId, phone]
      );
      allowed = tenantCheck.rowCount > 0;
    }

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "🚫 لا تملك صلاحية لعرض هذه الوحدة.",
      });
    }

    /* --------------------------------------------------------
       6️⃣ المصروفات
    -------------------------------------------------------- */
    const expensesRes = await client.query(
      `
      SELECT *
      FROM expenses
      WHERE unit_id = $1
      ORDER BY date DESC
      `,
      [unitId]
    );

    /* --------------------------------------------------------
       7️⃣ الإرجاع النهائي
    -------------------------------------------------------- */
    res.json({
      success: true,
      message: "✅ تم جلب تفاصيل الوحدة بنجاح.",
      data: {
        ...unit,
        status: unit_status,
        // عقد نشط واحد إن وجد
        active_contract: activeContract || null,

        // كل العقود (قديم + جديد)
        contracts: contractsWithTenant,
        contracts_count: contractsWithTenant.length,

        expenses: expensesRes.rows,
        expenses_count: expensesRes.rowCount,
      },
    });
  } catch (err) {
    console.error("❌ Error fetching unit details:", err);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحميل تفاصيل الوحدة.",
      details: err.message,
    });
  } finally {
    client.release();
  }
});






router.put("/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  let {
    unit_no,
    unit_type,
    unit_area,
    electric_meter_no,
    water_meter_no
  } = req.body;

  try {
    /* --------------------------------------------------------
       1️⃣ تأكد أن الوحدة موجودة
    -------------------------------------------------------- */
    const unitRes = await pool.query(
      `SELECT id, unit_no 
       FROM units 
       WHERE id = $1`,
      [id]
    );

    if (unitRes.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "❌ الوحدة غير موجودة"
      });
    }

    const existing = unitRes.rows[0];

    /* --------------------------------------------------------
       2️⃣ منع تغيير رقم الوحدة إذا كانت مرتبطة بعقد
    -------------------------------------------------------- */
    if (unit_no && unit_no !== existing.unit_no) {
      const linked = await pool.query(
        `SELECT 1 FROM contract_units WHERE unit_id=$1 LIMIT 1`,
        [id]
      );

      if (linked.rowCount > 0) {
        return res.status(400).json({
          success: false,
          message: "⚠️ لا يمكن تعديل رقم الوحدة لأنها مرتبطة بعقد. يمكنك تعديل العداد والمساحة فقط."
        });
      }
    }

    /* --------------------------------------------------------
       3️⃣ تنظيف الفالديشن
    -------------------------------------------------------- */
    if (unit_no && !/^\d+$/.test(unit_no)) {
      return res.status(400).json({
        success: false,
        message: "❌ رقم الوحدة يجب أن يكون أرقام فقط"
      });
    }

    if (unit_area && isNaN(Number(unit_area))) {
      return res.status(400).json({
        success: false,
        message: "❌ مساحة الوحدة يجب أن تكون رقم"
      });
    }

    /* --------------------------------------------------------
       4️⃣ التحديث
    -------------------------------------------------------- */
    const updateRes = await pool.query(
      `
      UPDATE units
      SET
        unit_no = COALESCE($1, unit_no),
        unit_type = COALESCE($2, unit_type),
        unit_area = COALESCE($3, unit_area),
        electric_meter_no = COALESCE($4, electric_meter_no),
        water_meter_no = COALESCE($5, water_meter_no),
        updated_at = NOW()
      WHERE id = $6
      RETURNING 
        id, unit_no, unit_type, unit_area, electric_meter_no, water_meter_no
      `,
      [
        unit_no || null,
        unit_type || null,
        unit_area || null,
        electric_meter_no || null,
        water_meter_no || null,
        id
      ]
    );

    /* --------------------------------------------------------
       5️⃣ النجاح
    -------------------------------------------------------- */
    res.json({
      success: true,
      message: "✅ تم تحديث بيانات الوحدة بنجاح",
      data: updateRes.rows[0]
    });

  } catch (err) {
    console.error("❌ Error updating unit:", err);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحديث بيانات الوحدة",
      details: err.message
    });
  }
});



/* =========================================================
   🏘️ جلب الوحدات التابعة لعقار معين (مع فلترة الصلاحيات)
========================================================= */
router.get("/by-property/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { activeRole, id: userId, phone } = req.user;

  try {
    let query = "";
    let params = [];

    // 👑 الأدمن يشوف كل الوحدات
    if (activeRole === "admin") {
      query = `
        SELECT 
          u.id, u.unit_no, u.unit_type, u.property_id, 
          u.status, 
          p.office_id,
          o.name AS office_name
        FROM units u
        LEFT JOIN properties p ON p.id = u.property_id
        LEFT JOIN offices o ON o.id = p.office_id
        WHERE u.property_id = $1
        ORDER BY u.unit_no;
      `;
      params = [id];
    }

    // 🏢 المكتب أو المشرف يشوف فقط وحدات مكتبه
    else if (["office", "office_admin"].includes(activeRole)) {
      query = `
        SELECT 
          u.id, u.unit_no, u.unit_type, u.property_id,
          u.status,
          p.office_id,
          o.name AS office_name
        FROM units u
        JOIN properties p ON p.id = u.property_id
        JOIN offices o ON o.id = p.office_id
        WHERE 
          u.property_id = $1
          AND (
            p.office_id IN (SELECT id FROM offices WHERE owner_id = $2 AND is_owner_office = false)
            OR p.office_id IN (SELECT office_id FROM office_users WHERE user_id = $2)
          )
        ORDER BY u.unit_no;
      `;
      params = [id, userId];
    }

    // 🏠 المالك يشوف فقط الوحدات التابعة لعقوده
    else if (["owner", "مالك"].includes(activeRole)) {
      query = `
        SELECT DISTINCT 
          u.id, u.unit_no, u.unit_type, u.property_id, u.status
        FROM units u
        JOIN contract_units cu ON cu.unit_id = u.id
JOIN contracts c ON c.id = cu.contract_id
        JOIN contract_parties cp ON cp.contract_id = c.id
        JOIN parties p ON p.id = cp.party_id
        WHERE u.property_id = $1
          AND LOWER(TRIM(cp.role)) IN ('lessor','مالك')
          AND REPLACE(REPLACE(p.phone,'+966','0'),' ','') = REPLACE(REPLACE($2,'+966','0'),' ','')
        ORDER BY u.unit_no;
      `;
      params = [id, phone];
    }

    // 👤 المستأجر يشوف فقط الوحدات التابعة لعقوده
    else if (["tenant", "مستأجر"].includes(activeRole)) {
      query = `
        SELECT DISTINCT 
          u.id, u.unit_no, u.unit_type, u.property_id, u.status
        FROM units u
        JOIN contract_units cu ON cu.unit_id = u.id
JOIN contracts c ON c.id = cu.contract_id
        JOIN contract_parties cp ON cp.contract_id = c.id
        JOIN parties p ON p.id = cp.party_id
        WHERE u.property_id = $1
          AND LOWER(TRIM(cp.role)) IN ('tenant','مستأجر')
          AND REPLACE(REPLACE(p.phone,'+966','0'),' ','') = REPLACE(REPLACE($2,'+966','0'),' ','')
        ORDER BY u.unit_no;
      `;
      params = [id, phone];
    }

    // 🚫 صلاحية مرفوضة
    else {
      return res.status(403).json({
        success: false,
        message: "🚫 لا تملك صلاحية لعرض الوحدات.",
      });
    }

    const { rows } = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("❌ Error fetching units by property:", err);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء جلب الوحدات.",
      details: err.message,
    });
  }
});

/* =========================================================
   ➕ إضافة وحدة جديدة (POST /units)
   ========================================================= */
router.post("/", async (req, res) => {
  const { unit_no, unit_type, unit_area, electric_meter_no, water_meter_no, status, notes, property_id } = req.body;

  try {
    // 🔹 التحقق من البيانات الأساسية
    if (!unit_no || !property_id || !unit_type) {
      return res.status(400).json({
        success: false,
        message: "❌ رقم الوحدة ونوعها والعقار مطلوبة.",
      });
    }

    // 🔹 تحقق أن رقم الوحدة يحتوي فقط على أرقام
    if (!/^[0-9]+$/.test(unit_no)) {
      return res.status(400).json({
        success: false,
        message: "❌ رقم الوحدة يجب أن يحتوي على أرقام فقط.",
      });
    }

    // 🔹 تحقق من عدم وجود وحدة بنفس الرقم في نفس العقار
    const { rows: existing } = await pool.query(
      `SELECT id FROM units WHERE property_id = $1 AND unit_no = $2`,
      [property_id, unit_no]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `❌ توجد وحدة أخرى بنفس الرقم (${unit_no}) ضمن نفس العقار.`,
      });
    }

    // 🔹 إدخال الوحدة الجديدة
    const { rows } = await pool.query(
      `
      INSERT INTO units (
        unit_no, unit_type, unit_area,
        electric_meter_no, water_meter_no,
        status, property_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, unit_no, unit_type, unit_area, status
      `,
      [unit_no, unit_type, unit_area || null, electric_meter_no || null, water_meter_no || null, status || "vacant" || null, property_id]
    );

    res.status(201).json({
      success: true,
      message: "✅ تم إضافة الوحدة بنجاح.",
      data: rows[0],
    });
  } catch (err) {
    console.error("❌ Error adding unit:", err);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء إضافة الوحدة.",
      details: err.message,
    });
  }
});
export default router;
