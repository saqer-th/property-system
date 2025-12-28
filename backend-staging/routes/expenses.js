import express from "express";
import pool from "../db/pool.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/* =========================================================
   💸 1️⃣ جلب المصروفات الخاصة بالمستخدم الحالي (بدعم صلاحيات دقيقة)
   ========================================================= */
router.get("/my", verifyToken, async (req, res) => {
  const { phone, activeRole, id: userId } = req.user;
  const client = await pool.connect();

  try {
    let query = "";
    let params = [];

    /* =========================================================
       👑 1️⃣ الأدمن يشاهد كل المصروفات
    ========================================================= */
    if (activeRole === "admin") {
      query = `
        SELECT 
          e.id, e.expense_scope, e.description, e.amount, e.expense_type,
          e.paid_by, e.on_whom, e.settlement_type, e.settlement_timing, e.date,
          e.property_id, e.unit_id, e.contract_id, e.office_id,
          p.property_type AS property_name, 
          u.unit_no, 
          c.contract_no,
          COALESCE(o.name, o2.name, o3.name) AS office_name
        FROM expenses e
        LEFT JOIN contracts c ON c.id = e.contract_id
        LEFT JOIN offices o ON o.id = c.office_id
        LEFT JOIN properties p ON p.id = e.property_id
        LEFT JOIN offices o2 ON o2.id = p.office_id
        LEFT JOIN units u ON u.id = e.unit_id
        LEFT JOIN offices o3 ON o3.id = e.office_id
        ORDER BY e.date DESC, e.id DESC;
      `;
    }

    /* =========================================================
       🏢 2️⃣ المكتب أو المشرف يشاهد المصروفات الخاصة بمكتبه
    ========================================================= */
    else if (["office", "office_admin"].includes(activeRole)) {
      query = `
        SELECT 
          e.id, e.expense_scope, e.description, e.amount, e.expense_type,
          e.paid_by, e.on_whom, e.settlement_type, e.settlement_timing, e.date,
          e.property_id, e.unit_id, e.contract_id, 
          COALESCE(c.office_id, p.office_id, e.office_id) AS office_id,
          p.property_type AS property_name, 
          u.unit_no, 
          c.contract_no,
          (
            SELECT name 
            FROM offices 
            WHERE id = COALESCE(c.office_id, p.office_id, e.office_id)
          ) AS office_name
        FROM expenses e
        LEFT JOIN contracts c ON c.id = e.contract_id
        LEFT JOIN properties p ON p.id = e.property_id
        LEFT JOIN units u ON u.id = e.unit_id
        WHERE 
          COALESCE(c.office_id, p.office_id, e.office_id) IN (
            SELECT id FROM offices WHERE owner_id = $1 AND is_owner_office = false
            UNION
            SELECT office_id FROM office_users WHERE user_id = $1
          )
        ORDER BY e.date DESC, e.id DESC;
      `;
      params = [userId];
    }
    /* =========================================================
      🏠 2.5️⃣ مالك Self-Managed Owner
      يرى فقط المصروفات التابعة لمكتبه الخاص
      ========================================================= */
    else if (activeRole === "self_office_admin") {
      query = `
        SELECT 
          e.id,
          e.expense_scope,
          e.description,
          e.amount,
          e.expense_type,
          e.paid_by,
          e.on_whom,
          e.settlement_type,
          e.settlement_timing,
          e.date,
          e.property_id,
          e.unit_id,
          e.contract_id,
          p.property_type AS property_name,
          u.unit_no,
          c.contract_no,
          o.name AS office_name
        FROM expenses e
        LEFT JOIN contracts c ON c.id = e.contract_id
        LEFT JOIN properties p ON p.id = e.property_id
        LEFT JOIN units u ON u.id = e.unit_id
        LEFT JOIN offices o ON o.id = COALESCE(c.office_id, p.office_id, e.office_id)
        WHERE COALESCE(c.office_id, p.office_id, e.office_id) = (
          SELECT id FROM offices
          WHERE owner_id = $1 AND is_owner_office = true
          LIMIT 1
        )
        ORDER BY e.date DESC, e.id DESC;
      `;
      params = [userId];
    }

    /* =========================================================
       🏠 3️⃣ المالك يرى فقط مصروفات عقوده أو عقاراته
    ========================================================= */
    else if (activeRole === "owner" || activeRole === "مالك") {
      query = `
        SELECT DISTINCT 
          e.id, e.expense_scope, e.description, e.amount, e.expense_type,
          e.paid_by, e.on_whom, e.settlement_type, e.settlement_timing, e.date,
          e.property_id, e.unit_id, e.contract_id,
          p.property_type AS property_name, 
          u.unit_no, 
          c.contract_no,
          o.name AS office_name
        FROM expenses e
        LEFT JOIN properties p ON p.id = e.property_id
        LEFT JOIN units u ON u.id = e.unit_id
        LEFT JOIN contracts c ON c.id = e.contract_id
        LEFT JOIN offices o ON o.id = c.office_id
        JOIN contract_parties cpL 
          ON cpL.contract_id = c.id AND LOWER(TRIM(cpL.role)) IN ('lessor','مالك')
        JOIN parties owner ON owner.id = cpL.party_id
        WHERE REPLACE(REPLACE(owner.phone,'+966','0'),' ','') = REPLACE(REPLACE($1,'+966','0'),' ','')
        ORDER BY e.date DESC, e.id DESC;
      `;
      params = [phone];
    }

    /* =========================================================
       👤 4️⃣ المستأجر يشاهد فقط مصروفات العقود التي هو طرف فيها
    ========================================================= */
    else if (activeRole === "tenant" || activeRole === "مستأجر") {
      query = `
        SELECT DISTINCT 
          e.id, e.expense_scope, e.description, e.amount, e.expense_type,
          e.paid_by, e.on_whom, e.settlement_type, e.settlement_timing, e.date,
          e.property_id, e.unit_id, e.contract_id,
          p.property_type AS property_name, 
          u.unit_no, 
          c.contract_no,
          o.name AS office_name
        FROM expenses e
        LEFT JOIN properties p ON p.id = e.property_id
        LEFT JOIN units u ON u.id = e.unit_id
        LEFT JOIN contracts c ON c.id = e.contract_id
        LEFT JOIN offices o ON o.id = c.office_id
        JOIN contract_parties cpT 
          ON cpT.contract_id = c.id AND LOWER(TRIM(cpT.role)) IN ('tenant','مستأجر')
        JOIN parties tenant ON tenant.id = cpT.party_id
        WHERE REPLACE(REPLACE(tenant.phone,'+966','0'),' ','') = REPLACE(REPLACE($1,'+966','0'),' ','')
        ORDER BY e.date DESC, e.id DESC;
      `;
      params = [phone];
    }

    /* =========================================================
       🚫 لا يملك صلاحية
    ========================================================= */
    else {
      return res.status(403).json({
        success: false,
        message: "🚫 لا تملك صلاحية لعرض المصروفات.",
      });
    }

    const { rows } = await client.query(query, params);

    res.json({
      success: true,
      total: rows.length,
      message: "✅ تم جلب المصروفات بنجاح",
      data: rows,
    });
  } catch (err) {
    console.error("❌ خطأ في جلب المصروفات:", err);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحميل المصروفات.",
      details: err.message,
    });
  } finally {
    client.release();
  }
});


/* =========================================================
   ➕ 2️⃣ إضافة مصروف جديد
   ========================================================= */
router.post("/", verifyToken, async (req, res) => {
  const {
    expense_type,
    custom_expense_type,
    amount,
    date,
    on_whom,
    notes,
    link_type,
    property_id,
    unit_id,
    contract_id,
  } = req.body;

  const { activeRole, id: userId } = req.user;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 💡 تحديد نوع المصروف النهائي
    const finalExpenseType =
      expense_type === "أخرى" ? custom_expense_type : expense_type;

    // 💡 تحديد نطاق المصروف
    let expense_scope = "عام";
    if (link_type === "property") expense_scope = "عقار";
    else if (link_type === "unit") expense_scope = "وحدة";
    else if (link_type === "contract") expense_scope = "عقد";

    // 💰 الجهة الدافعة حسب الدور
    const paid_by =
      ["admin", "office", "office_admin"].includes(activeRole)
        ? "مكتب"
        : activeRole === "owner"
        ? "مالك"
        : activeRole === "tenant"
        ? "مستأجر"
        : "غير محدد";

    // 🏢 تحديد رقم المكتب (office_id)
    let office_id = null;

    if (["office", "office_admin"].includes(activeRole)) {
      // المستخدم مكتب أو مشرف مكتب
      const officeRes = await client.query(
        `SELECT id FROM offices WHERE owner_id=$1 AND is_owner_office = false
         UNION
         SELECT office_id FROM office_users WHERE user_id=$1
         LIMIT 1;`,
        [userId]
      );
      if (officeRes.rows.length > 0) office_id = officeRes.rows[0].id;
    } else if (contract_id) {
      // في حال المصروف مرتبط بعقد
      const officeRes = await client.query(
        `SELECT office_id FROM contracts WHERE id=$1 LIMIT 1;`,
        [contract_id]
      );
      if (officeRes.rows.length > 0) office_id = officeRes.rows[0].office_id;
    } else if (property_id) {
      // في حال المصروف مرتبط بعقار
      const officeRes = await client.query(
        `SELECT office_id FROM properties WHERE id=$1 LIMIT 1;`,
        [property_id]
      );
      if (officeRes.rows.length > 0) office_id = officeRes.rows[0].office_id;
    }

    // 🧾 إدخال المصروف
    const insertQuery = `
      INSERT INTO expenses (
        expense_scope, property_id, unit_id, contract_id,
        office_id, description, amount, expense_type, paid_by, on_whom,
        settlement_type, settlement_timing, date
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING id
    `;

    const values = [
      expense_scope,
      property_id || null,
      unit_id || null,
      contract_id || null,
      office_id || null,
      notes || "",
      Number(amount) || 0,
      finalExpenseType || null,
      paid_by,
      on_whom || null,
      "عادية",
      "فوري",
      date || new Date(),
    ];

    const { rows } = await client.query(insertQuery, values);

    await client.query("COMMIT");

    res.json({
      success: true,
      expense_id: rows[0].id,
      message: "✅ تم إضافة المصروف وربطه بالمكتب بنجاح",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ خطأ في إضافة المصروف:", err);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء إضافة المصروف.",
      details: err.message,
    });
  } finally {
    client.release();
  }
});

router.get("/by-contract/:id", verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    const query = `
      SELECT 
        e.id,
        e.amount,
        e.expense_type,
        e.notes,
        TO_CHAR(e.date, 'YYYY-MM-DD') AS date
      FROM expenses e
      WHERE e.contract_id = $1
      ORDER BY e.date DESC
    `;

    const { rows } = await pool.query(query, [id]);

    return res.json({
      success: true,
      data: rows,
    });

  } catch (err) {
    console.error("❌ Error fetching contract expenses:", err);
    return res.status(500).json({
      success: false,
      message: "Error loading contract expenses",
    });
  }
});
export default router;
