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

    /* 👑 الأدمن يشاهد جميع الوحدات */
    if (activeRole === "admin") {
      query = `
        SELECT 
          u.id, u.unit_no, u.unit_type, u.status, u.unit_area,
          p.id AS property_id, p.property_name, p.property_type, p.property_usage,
          o.name AS office_name
        FROM units u
        LEFT JOIN properties p ON p.id = u.property_id
        LEFT JOIN contracts c ON c.id = u.contract_id
        LEFT JOIN offices o ON o.id = c.office_id
        ORDER BY p.id, u.unit_no;
      `;
    }

    /* 🏢 المكتب يشاهد فقط الوحدات التابعة لعقود مكتبه */
    else if (["office", "office_admin"].includes(activeRole)) {
      query = `
        SELECT 
          u.id, u.unit_no, u.unit_type, u.status, u.unit_area,
          p.id AS property_id, p.property_name, p.property_type, p.property_usage,
          o.name AS office_name
        FROM units u
        JOIN contracts c ON c.id = u.contract_id
        JOIN offices o ON o.id = c.office_id
        LEFT JOIN properties p ON p.id = u.property_id
        WHERE o.owner_id = $1
        ORDER BY p.id, u.unit_no;
      `;
      params = [userId];
    }

    /* 🏠 المالك يرى وحداته فقط (كمؤجر) */
    else if (["owner", "مالك"].includes(activeRole)) {
      query = `
        SELECT 
          u.id, u.unit_no, u.unit_type, u.status, u.unit_area,
          p.id AS property_id, p.property_name, p.property_type, p.property_usage,
          o.name AS office_name
        FROM units u
        JOIN contracts c ON c.id = u.contract_id
        JOIN contract_parties cp ON cp.contract_id = c.id
        JOIN parties pr ON pr.id = cp.party_id
        LEFT JOIN offices o ON o.id = c.office_id
        LEFT JOIN properties p ON p.id = u.property_id
        WHERE LOWER(TRIM(cp.role)) IN ('lessor','مالك')
          AND REPLACE(REPLACE(pr.phone,'+966','0'),' ','') = REPLACE(REPLACE($1,'+966','0'),' ','')
        ORDER BY p.id, u.unit_no;
      `;
      params = [phone];
    }

    /* 👤 المستأجر يرى الوحدات المرتبطة بعقوده */
    else if (["tenant", "مستأجر"].includes(activeRole)) {
      query = `
        SELECT 
          u.id, u.unit_no, u.unit_type, u.status, u.unit_area,
          p.id AS property_id, p.property_name, p.property_type, p.property_usage,
          o.name AS office_name
        FROM units u
        JOIN contracts c ON c.id = u.contract_id
        JOIN contract_parties cp ON cp.contract_id = c.id
        JOIN parties t ON t.id = cp.party_id
        LEFT JOIN offices o ON o.id = c.office_id
        LEFT JOIN properties p ON p.id = u.property_id
        WHERE LOWER(TRIM(cp.role)) IN ('tenant','مستأجر')
          AND REPLACE(REPLACE(t.phone,'+966','0'),' ','') = REPLACE(REPLACE($1,'+966','0'),' ','')
        ORDER BY p.id, u.unit_no;
      `;
      params = [phone];
    }

    /* 🚫 غير مصرح له */
    else {
      return res.status(403).json({
        success: false,
        message: "🚫 لا تملك صلاحية للوصول إلى هذه البيانات.",
      });
    }

    const { rows } = await client.query(query, params);

    res.json({
      success: true,
      total: rows.length,
      message: "✅ تم جلب الوحدات بنجاح.",
      data: rows,
    });
  } catch (err) {
    console.error("❌ Error fetching user's units:", err);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحميل الوحدات.",
      details: err.message,
    });
  } finally {
    client.release();
  }
});

/* =========================================================
   🏗️ 2️⃣ جلب تفاصيل وحدة معينة (العقود + المصروفات)
   ========================================================= */
router.get("/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { activeRole, id: userId, phone } = req.user;
  const client = await pool.connect();

  try {
    // ✅ جلب بيانات الوحدة
    const unitRes = await client.query(
      `SELECT u.*, o.name AS office_name, o.id AS office_id, o.owner_id
       FROM units u
       LEFT JOIN contracts c ON c.id = u.contract_id
       LEFT JOIN offices o ON o.id = c.office_id
       WHERE u.id = $1`,
      [id]
    );

    if (unitRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "❌ الوحدة غير موجودة.",
      });
    }

    const unit = unitRes.rows[0];
    let allowed = false;

    // ✅ الأدمن يشوف كل شيء
    if (activeRole === "admin") {
      allowed = true;
    }
    // ✅ المكتب أو المشرف يشوف الوحدات التابعة لمكتبه (مالك أو موظف)
    else if (["office", "office_admin"].includes(activeRole)) {
      if (unit.office_id) {
        const officeCheck = await client.query(
          `SELECT 1 FROM offices 
           WHERE id = $1 
           AND (owner_id = $2 OR id IN (SELECT office_id FROM office_users WHERE user_id = $2))`,
          [unit.office_id, userId]
        );
        allowed = officeCheck.rows.length > 0;
      }
    }
    // ✅ المالك يشوف فقط وحداته
    else if (["owner", "مالك"].includes(activeRole)) {
      if (unit.contract_id) {
        const ownerCheck = await client.query(
          `SELECT 1 FROM contract_parties cp
           JOIN parties p ON p.id = cp.party_id
           WHERE cp.contract_id = $1
           AND LOWER(TRIM(cp.role)) IN ('lessor','مالك')
           AND REPLACE(REPLACE(p.phone,'+966','0'),' ','') = REPLACE(REPLACE($2,'+966','0'),' ','')`,
          [unit.contract_id, phone]
        );
        allowed = ownerCheck.rows.length > 0;
      }
    }
    // ✅ المستأجر يشوف فقط وحداته
    else if (["tenant", "مستأجر"].includes(activeRole)) {
      if (unit.contract_id) {
        const tenantCheck = await client.query(
          `SELECT 1 FROM contract_parties cp
           JOIN parties p ON p.id = cp.party_id
           WHERE cp.contract_id = $1
           AND LOWER(TRIM(cp.role)) IN ('tenant','مستأجر')
           AND REPLACE(REPLACE(p.phone,'+966','0'),' ','') = REPLACE(REPLACE($2,'+966','0'),' ','')`,
          [unit.contract_id, phone]
        );
        allowed = tenantCheck.rows.length > 0;
      }
    }

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "🚫 لا تملك صلاحية لعرض هذه الوحدة.",
      });
    }

    // 📜 جلب العقود الخاصة بالوحدة
    const contractsRes = await client.query(
      `SELECT * FROM contracts WHERE id = $1 ORDER BY tenancy_start DESC;`,
      [unit.contract_id]
    );

    // 💸 جلب المصروفات الخاصة بالوحدة
    const expensesRes = await client.query(
      `SELECT id, expense_type, on_whom, amount, notes, date
       FROM expenses
       WHERE unit_id = $1
       ORDER BY date DESC, id DESC;`,
      [id]
    );

    // ✅ الإرجاع النهائي
    res.json({
      success: true,
      message: "✅ تم جلب تفاصيل الوحدة بنجاح.",
      data: {
        ...unit,
        contracts: contractsRes.rows,
        expenses: expensesRes.rows,
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
          u.status, c.office_id, o.name AS office_name
        FROM units u
        LEFT JOIN contracts c ON c.id = u.contract_id
        LEFT JOIN offices o ON o.id = c.office_id
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
          u.status, c.office_id, o.name AS office_name
        FROM units u
        LEFT JOIN contracts c ON c.id = u.contract_id
        LEFT JOIN offices o ON o.id = c.office_id
        WHERE u.property_id = $1
          AND (
            o.owner_id = $2
            OR o.id IN (SELECT office_id FROM office_users WHERE user_id = $2)
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
        JOIN contracts c ON c.id = u.contract_id
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
        JOIN contracts c ON c.id = u.contract_id
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

export default router;
