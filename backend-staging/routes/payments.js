import express from "express";
import pool from "../db/pool.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/* =========================================================
   💵 جلب الدفعات الخاصة بالمستخدم الحالي (مع صلاحيات دقيقة)
   ========================================================= */
router.get("/my", verifyToken, async (req, res) => {
  const { phone, activeRole, id: userId } = req.user;
  const client = await pool.connect();

  try {
    let query = "";
    let params = [];

    /* =========================================================
       👑 1️⃣ الأدمن يشاهد جميع الدفعات
    ========================================================= */
    if (activeRole === "admin") {
      query = `
        SELECT 
          p.id,
          p.contract_id,
          p.due_date,
          p.amount,
          COALESCE(p.paid_amount, 0) AS paid_amount,
          (p.amount - COALESCE(p.paid_amount, 0)) AS remaining_amount,
          p.status,
          p.notes,
          p.receipt_id,
          c.contract_no,
          pr.property_type AS property_name,
          u.unit_no,
          o.name AS office_name,
          (SELECT name FROM parties pt
             JOIN contract_parties cp ON cp.party_id = pt.id
             WHERE cp.contract_id = c.id AND LOWER(TRIM(cp.role)) IN ('tenant','مستأجر')
             LIMIT 1) AS tenant_name
        FROM payments p
        LEFT JOIN contracts c ON c.id = p.contract_id
        LEFT JOIN properties pr ON pr.id = c.property_id
        LEFT JOIN contract_units cu ON cu.contract_id = c.id
LEFT JOIN units u ON u.id = cu.unit_id
        LEFT JOIN offices o ON o.id = c.office_id
        ORDER BY p.due_date ASC NULLS LAST, p.id ASC;
      `;
    }

    /* =========================================================
       🏢 2️⃣ المكتب: يشاهد فقط الدفعات التابعة لعقوده
       (العقود التي تخص المكتب الذي يملكه المستخدم الحالي)
    ========================================================= */
    else if (["office", "office_admin"].includes(activeRole)) {
      query = `
    SELECT 
      p.id,
      p.contract_id,
      p.due_date,
      p.amount,
      COALESCE(p.paid_amount, 0) AS paid_amount,
      (p.amount - COALESCE(p.paid_amount, 0)) AS remaining_amount,
      p.status,
      p.notes,
      p.receipt_id,
      c.contract_no,
      pr.property_type AS property_name,
      u.unit_no,
      o.name AS office_name,
      (SELECT name FROM parties pt
         JOIN contract_parties cp ON cp.party_id = pt.id
         WHERE cp.contract_id = c.id AND LOWER(TRIM(cp.role)) IN ('tenant','مستأجر')
         LIMIT 1) AS tenant_name
    FROM payments p
    JOIN contracts c ON c.id = p.contract_id
    JOIN offices o ON o.id = c.office_id
    LEFT JOIN properties pr ON pr.id = c.property_id
    LEFT JOIN contract_units cu ON cu.contract_id = c.id
LEFT JOIN units u ON u.id = cu.unit_id
    WHERE 
      c.office_id IN (
        SELECT office_id FROM office_users WHERE user_id = $1
      )
      OR c.office_id IN (
        SELECT id FROM offices WHERE owner_id = $1 AND is_owner_office = false
      )
    ORDER BY p.due_date ASC NULLS LAST, p.id ASC;
  `;
      params = [userId];
    }
    /* =========================================================
      🏠 2.5️⃣ مالك Self-Managed Owner
      ========================================================= */
    else if (activeRole === "self_office_admin") {
      query = `
        SELECT 
          p.id,
          p.contract_id,
          p.due_date,
          p.amount,
          COALESCE(p.paid_amount, 0) AS paid_amount,
          (p.amount - COALESCE(p.paid_amount, 0)) AS remaining_amount,
          p.status,
          p.notes,
          p.receipt_id,
          c.contract_no,
          pr.property_type AS property_name,
          u.unit_no,
          o.name AS office_name,
          (SELECT name FROM parties pt
            JOIN contract_parties cp ON cp.party_id = pt.id
            WHERE cp.contract_id = c.id AND LOWER(TRIM(cp.role)) IN ('tenant','مستأجر')
            LIMIT 1) AS tenant_name
        FROM payments p
        JOIN contracts c ON c.id = p.contract_id
        LEFT JOIN properties pr ON pr.id = c.property_id
        LEFT JOIN contract_units cu ON cu.contract_id = c.id
        LEFT JOIN units u ON u.id = cu.unit_id
        LEFT JOIN offices o ON o.id = c.office_id
        WHERE c.office_id = (
          SELECT id FROM offices 
          WHERE owner_id = $1 AND is_owner_office = true
          LIMIT 1
        )
        ORDER BY p.due_date ASC NULLS LAST, p.id ASC;
      `;
      params = [userId];
    }

    /* =========================================================
       🏠 3️⃣ المالك يرى فقط الدفعات الخاصة بعقوده
    ========================================================= */
    else if (activeRole === "owner" || activeRole === "مالك") {
      query = `
        SELECT DISTINCT 
          p.id,
          p.contract_id,
          p.due_date,
          p.amount,
          COALESCE(p.paid_amount, 0) AS paid_amount,
          (p.amount - COALESCE(p.paid_amount, 0)) AS remaining_amount,
          p.status,
          p.notes,
          p.receipt_id,
          c.contract_no,
          pr.property_type AS property_name,
          u.unit_no,
          t.name AS tenant_name,
          o.name AS office_name
        FROM payments p
        JOIN contracts c ON c.id = p.contract_id
        JOIN contract_parties cpLessor 
          ON cpLessor.contract_id = c.id AND LOWER(TRIM(cpLessor.role)) IN ('lessor','مالك')
        JOIN parties owner ON owner.id = cpLessor.party_id
        LEFT JOIN properties pr ON pr.id = c.property_id
        LEFT JOIN contract_units cu ON cu.contract_id = c.id
LEFT JOIN units u ON u.id = cu.unit_id
        LEFT JOIN offices o ON o.id = c.office_id
        LEFT JOIN contract_parties cpTenant 
          ON cpTenant.contract_id = c.id AND LOWER(TRIM(cpTenant.role)) IN ('tenant','مستأجر')
        LEFT JOIN parties t ON t.id = cpTenant.party_id
        WHERE REPLACE(REPLACE(owner.phone,'+966','0'),' ','') = REPLACE(REPLACE($1,'+966','0'),' ','')
        ORDER BY p.due_date ASC NULLS LAST, p.id ASC;
      `;
      params = [phone];
    }

    /* =========================================================
       👤 4️⃣ المستأجر يرى فقط الدفعات الخاصة بعقوده
    ========================================================= */
    else if (activeRole === "tenant" || activeRole === "مستأجر") {
      query = `
        SELECT DISTINCT 
          p.id,
          p.contract_id,
          p.due_date,
          p.amount,
          COALESCE(p.paid_amount, 0) AS paid_amount,
          (p.amount - COALESCE(p.paid_amount, 0)) AS remaining_amount,
          p.status,
          p.notes,
          p.receipt_id,
          c.contract_no,
          pr.property_type AS property_name,
          u.unit_no,
          owner.name AS lessor_name,
          o.name AS office_name
        FROM payments p
        JOIN contracts c ON c.id = p.contract_id
        JOIN contract_parties cpTenant 
          ON cpTenant.contract_id = c.id AND LOWER(TRIM(cpTenant.role)) IN ('tenant','مستأجر')
        JOIN parties tenant ON tenant.id = cpTenant.party_id
        LEFT JOIN properties pr ON pr.id = c.property_id
        LEFT JOIN contract_units cu ON cu.contract_id = c.id
LEFT JOIN units u ON u.id = cu.unit_id
        LEFT JOIN offices o ON o.id = c.office_id
        LEFT JOIN contract_parties cpOwner 
          ON cpOwner.contract_id = c.id AND LOWER(TRIM(cpOwner.role)) IN ('lessor','مالك')
        LEFT JOIN parties owner ON owner.id = cpOwner.party_id
        WHERE REPLACE(REPLACE(tenant.phone,'+966','0'),' ','') = REPLACE(REPLACE($1,'+966','0'),' ','')
        ORDER BY p.due_date ASC NULLS LAST, p.id ASC;
      `;
      params = [phone];
    }

    /* =========================================================
       🚫 غير مصرح له
    ========================================================= */
    else {
      return res.status(403).json({
        success: false,
        message: "🚫 لا تملك صلاحية لعرض الدفعات.",
      });
    }

    /* =========================================================
       ✅ تنفيذ الاستعلام
    ========================================================= */
    const result = await client.query(query, params);

    res.json({
      success: true,
      message: "✅ تم جلب الدفعات بنجاح.",
      total: result.rows.length,
      data: result.rows,
    });
  } catch (err) {
    console.error("❌ خطأ في جلب الدفعات:", err);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحميل الدفعات.",
      details: err.message,
    });
  } finally {
    client.release();
  }
});
/* ======================================
   📌 جلب الدفعات الخاصة بعقد معين
====================================== */
router.get("/by-contract/:id", verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    const query = `
      SELECT 
        id,
        due_date,
        amount,
        COALESCE(paid_amount, 0) AS paid_amount,
        (amount - COALESCE(paid_amount, 0)) AS remaining_amount,
        status
      FROM payments
      WHERE contract_id = $1
      ORDER BY due_date ASC
    `;

    const { rows } = await pool.query(query, [id]);

    return res.json({
      success: true,
      data: rows,
    });

  } catch (err) {
    console.error("❌ Error fetching payments:", err);
    return res.status(500).json({
      success: false,
      message: "Error loading contract payments",
    });
  }
});

/* =========================================================
   📊 Payments Summary (JSON) 
   /payments/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
========================================================= */
router.get("/summary", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: "Missing date range",
      });
    }

    // 1️⃣ تحديد المكتب الذي ينتمي له المستخدم
    const officeQuery = `
      SELECT id FROM offices WHERE owner_id = $1 AND is_owner_office = false
      UNION
      SELECT office_id FROM office_users WHERE user_id = $1
    `;
    const offices = await pool.query(officeQuery, [userId]);

    if (offices.rowCount === 0)
      return res.json({
        payments: [],
        payments_count: 0,
        contracts_count: 0,
        total_amount: 0,
      });

    const officeId = offices.rows[0].id;

    // 2️⃣ جلب المدفوعات حسب التاريخ
    const paymentsQuery = `
   SELECT 
  p.id,
  p.amount,
  p.due_date,
  p.status,
  c.contract_no,
  c.id AS contract_id,
  t.name AS tenant_name,
  t.phone AS tenant_phone
FROM payments p
JOIN contracts c ON c.id = p.contract_id
LEFT JOIN contract_parties cp ON cp.contract_id = c.id AND LOWER(cp.role) IN ('tenant', 'مستأجر', 'مستاجر')
LEFT JOIN parties t ON t.id = cp.party_id
WHERE c.office_id = $1
AND p.due_date BETWEEN $2 AND $3
ORDER BY p.due_date ASC
    `;

    const payments = await pool.query(paymentsQuery, [officeId, from, to]);

    // 3️⃣ الحسابات
    const totalAmount = payments.rows.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0
    );

    const uniqueContracts = new Set(payments.rows.map((p) => p.contract_id));

    return res.json({
      payments: payments.rows,
      payments_count: payments.rowCount,
      total_amount: totalAmount,
      contracts_count: uniqueContracts.size,
    });

  } catch (err) {
    console.error("❌ Error in /payments/summary:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
