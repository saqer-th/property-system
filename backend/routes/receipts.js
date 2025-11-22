import express from "express";
import pool from "../db/pool.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/* =========================================================
   🧾 1️⃣ جلب السندات الخاصة بالمستخدم الحالي (حسب الصلاحيات)
   ========================================================= */
router.get("/my", verifyToken, async (req, res) => {
  const { phone, activeRole, id: userId } = req.user;
  const client = await pool.connect();

  try {
    let query = "";
    let params = [];

    /* =========================================================
       👑 1️⃣ الأدمن يشاهد جميع السندات
    ========================================================= */
    if (activeRole === "admin") {
      query = `
        SELECT 
          r.id,
          r.receipt_type,
          CASE 
            WHEN r.receipt_type ILIKE 'قبض' THEN 'سند قبض'
            WHEN r.receipt_type ILIKE 'صرف' THEN 'سند صرف'
            WHEN r.receipt_type ILIKE 'adjustment' THEN 'تسوية'
            ELSE 'غير محدد'
          END AS receipt_type_label,
          r.reference_no,
          r.reason,
          r.description AS notes,
          r.amount,
          COALESCE(r.payer_name, r.payer, '—') AS payer_name,
          COALESCE(r.receiver_name, r.receiver, '—') AS receiver_name,
          r.payment_method,
          TO_CHAR(r.date, 'YYYY-MM-DD') AS receipt_date,
          r.property_id,
          r.unit_id,
          r.contract_id,
          p.property_type AS property_name,
          u.unit_no,
          c.contract_no,
          o.name AS office_name
        FROM receipts r
        LEFT JOIN contracts c ON c.id = r.contract_id
        LEFT JOIN offices o ON o.id = c.office_id
        LEFT JOIN properties p ON p.id = r.property_id
        LEFT JOIN units u ON u.id = r.unit_id
        ORDER BY r.date DESC, r.id DESC;
      `;
    }

    /* =========================================================
       🏢 2️⃣ المكتب أو مشرف المكتب — يشاهد فقط سندات مكتبه
       (سواء عبر عقد أو عقار أو وحدة)
    ========================================================= */
    else if (["office", "office_admin"].includes(activeRole)) {
      query = `
        SELECT 
          r.id,
          r.receipt_type,
          CASE 
            WHEN r.receipt_type ILIKE 'قبض' THEN 'سند قبض'
            WHEN r.receipt_type ILIKE 'صرف' THEN 'سند صرف'
            WHEN r.receipt_type ILIKE 'adjustment' THEN 'تسوية'
            ELSE 'غير محدد'
          END AS receipt_type_label,
          r.reference_no,
          r.reason,
          r.description AS notes,
          r.amount,
          COALESCE(r.payer_name, r.payer, '—') AS payer_name,
          COALESCE(r.receiver_name, r.receiver, '—') AS receiver_name,
          r.payment_method,
          TO_CHAR(r.date, 'YYYY-MM-DD') AS receipt_date,
          r.property_id,
          r.unit_id,
          r.contract_id,
          p.property_type AS property_name,
          u.unit_no,
          c.contract_no,
          COALESCE(o.name, o2.name) AS office_name
        FROM receipts r
        LEFT JOIN contracts c ON c.id = r.contract_id
        LEFT JOIN properties p ON p.id = r.property_id
        LEFT JOIN units u ON u.id = r.unit_id
        LEFT JOIN offices o ON o.id = c.office_id
        LEFT JOIN offices o2 ON o2.id = p.office_id
        WHERE (
          -- 🔹 السند مرتبط بعقد ضمن مكتب المستخدم (سواء مالك أو موظف)
          c.office_id IN (
            SELECT id FROM offices WHERE owner_id = $1 AND is_owner_office = false
            UNION
            SELECT office_id FROM office_users WHERE user_id = $1
          )
          -- 🔹 أو السند مرتبط بعقار يتبع المكتب
          OR p.office_id IN (
            SELECT id FROM offices WHERE owner_id = $1 AND is_owner_office = false
            UNION
            SELECT office_id FROM office_users WHERE user_id = $1
          )
          -- 🔹 أو السند مرتبط بوحدة لعقار المكتب
          OR u.property_id IN (
            SELECT id FROM properties WHERE office_id IN (
              SELECT id FROM offices WHERE owner_id = $1 AND is_owner_office = false
              UNION
              SELECT office_id FROM office_users WHERE user_id = $1
            )
          )
          -- 🔹 أو المكتب نفسه مالك السند مباشرة
          OR r.office_id IN (
            SELECT id FROM offices WHERE owner_id = $1 AND is_owner_office = false
            UNION
            SELECT office_id FROM office_users WHERE user_id = $1
          )
        )
        ORDER BY r.date DESC, r.id DESC;
      `;
      params = [userId];
    }
    /* =========================================================
      🏠 2.5️⃣ مالك Self-Managed Owner
      يرى فقط السندات التابعة لمكتبه الخاص
      ========================================================= */
    else if (activeRole === "self_office_admin") {
      query = `
        SELECT 
          r.id,
          r.receipt_type,
          CASE 
            WHEN r.receipt_type ILIKE 'قبض' THEN 'سند قبض'
            WHEN r.receipt_type ILIKE 'صرف' THEN 'سند صرف'
            WHEN r.receipt_type ILIKE 'adjustment' THEN 'تسوية'
            ELSE 'غير محدد'
          END AS receipt_type_label,
          r.reference_no,
          r.reason,
          r.description AS notes,
          r.amount,
          COALESCE(r.payer_name, r.payer, '—') AS payer_name,
          COALESCE(r.receiver_name, r.receiver, '—') AS receiver_name,
          r.payment_method,
          TO_CHAR(r.date, 'YYYY-MM-DD') AS receipt_date,
          r.property_id,
          r.unit_id,
          r.contract_id,
          c.contract_no,
          u.unit_no,
          p.property_type AS property_name,
          o.name AS office_name
        FROM receipts r
        LEFT JOIN contracts c ON c.id = r.contract_id
        LEFT JOIN properties p ON p.id = r.property_id
        LEFT JOIN units u ON u.id = r.unit_id
        LEFT JOIN offices o ON o.id = COALESCE(c.office_id, p.office_id, r.office_id)
        WHERE COALESCE(c.office_id, p.office_id, r.office_id) = (
          SELECT id FROM offices
          WHERE owner_id = $1 AND is_owner_office = true
          LIMIT 1
        )
        ORDER BY r.date DESC, r.id DESC;
      `;
      params = [userId];
    }

    /* =========================================================
       🏠 3️⃣ المالك يشاهد فقط السندات الخاصة بعقوده
    ========================================================= */
    else if (["owner", "مالك"].includes(activeRole)) {
      query = `
        SELECT 
          r.id,
          r.receipt_type,
          CASE 
            WHEN r.receipt_type ILIKE 'قبض' THEN 'سند قبض'
            WHEN r.receipt_type ILIKE 'صرف' THEN 'سند صرف'
            WHEN r.receipt_type ILIKE 'adjustment' THEN 'تسوية'
            ELSE 'غير محدد'
          END AS receipt_type_label,
          r.reference_no,
          r.reason,
          r.description AS notes,
          r.amount,
          COALESCE(r.payer_name, r.payer, '—') AS payer_name,
          COALESCE(r.receiver_name, r.receiver, '—') AS receiver_name,
          r.payment_method,
          TO_CHAR(r.date, 'YYYY-MM-DD') AS receipt_date,
          r.property_id,
          r.unit_id,
          r.contract_id,
          c.contract_no,
          u.unit_no,
          p.property_type AS property_name,
          o.name AS office_name
        FROM receipts r
        LEFT JOIN contracts c ON c.id = r.contract_id
        LEFT JOIN offices o ON o.id = c.office_id
        LEFT JOIN properties p ON p.id = r.property_id
        LEFT JOIN units u ON u.id = r.unit_id
        JOIN contract_parties cpL 
          ON cpL.contract_id = c.id AND LOWER(TRIM(cpL.role)) IN ('lessor','مالك')
        JOIN parties owner 
          ON owner.id = cpL.party_id
        WHERE REPLACE(REPLACE(owner.phone,'+966','0'),' ','') = REPLACE(REPLACE($1,'+966','0'),' ','')
        ORDER BY r.date DESC, r.id DESC;
      `;
      params = [phone];
    }

    /* =========================================================
       👤 4️⃣ المستأجر يرى فقط سنداته
    ========================================================= */
    else if (["tenant", "مستأجر"].includes(activeRole)) {
      query = `
        SELECT 
          r.id,
          r.receipt_type,
          CASE 
            WHEN r.receipt_type ILIKE 'قبض' THEN 'سند قبض'
            WHEN r.receipt_type ILIKE 'صرف' THEN 'سند صرف'
            WHEN r.receipt_type ILIKE 'adjustment' THEN 'تسوية'
            ELSE 'غير محدد'
          END AS receipt_type_label,
          r.reference_no,
          r.reason,
          r.description AS notes,
          r.amount,
          COALESCE(r.payer_name, r.payer, '—') AS payer_name,
          COALESCE(r.receiver_name, r.receiver, '—') AS receiver_name,
          r.payment_method,
          TO_CHAR(r.date, 'YYYY-MM-DD') AS receipt_date,
          r.property_id,
          r.unit_id,
          r.contract_id,
          c.contract_no,
          u.unit_no,
          p.property_type AS property_name,
          o.name AS office_name
        FROM receipts r
        LEFT JOIN contracts c ON c.id = r.contract_id
        LEFT JOIN offices o ON o.id = c.office_id
        LEFT JOIN properties p ON p.id = r.property_id
        LEFT JOIN units u ON u.id = r.unit_id
        JOIN contract_parties cpT 
          ON cpT.contract_id = c.id AND LOWER(TRIM(cpT.role)) IN ('tenant','مستأجر')
        JOIN parties tenant 
          ON tenant.id = cpT.party_id
        WHERE REPLACE(REPLACE(tenant.phone,'+966','0'),' ','') = REPLACE(REPLACE($1,'+966','0'),' ','')
        ORDER BY r.date DESC, r.id DESC;
      `;
      params = [phone];
    }

    /* =========================================================
       🚫 غير مصرح له
    ========================================================= */
    else {
      return res.status(403).json({
        success: false,
        message: "🚫 لا تملك صلاحية لعرض السندات.",
      });
    }

    const { rows } = await client.query(query, params);

    res.json({
      success: true,
      total: rows.length,
      message: "✅ تم جلب السندات بنجاح",
      data: rows,
    });
  } catch (err) {
    console.error("❌ خطأ في جلب السندات:", err);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحميل السندات.",
      details: err.message,
    });
  } finally {
    client.release();
  }
});



/* =========================================================
   ➕ 2️⃣ إضافة سند جديد (قبض / صرف / تسوية)
   ========================================================= */
// =====================================================
// 🧾 إنشاء سند جديد
// =====================================================
router.post("/", verifyToken, async (req, res) => {
  const {
    receipt_type,
    type,
    property_id,
    unit_id,
    contract_id,
    notes,
    description,
    amount,
    payer,
    payer_name,
    receiver,
    receiver_name,
    payment_method,
    date,
    reason,
  } = req.body;

  const { activeRole, id: userId } = req.user;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const ref = `R-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;

    // =====================================================
    // 🎯 1️⃣ تحديد المكتب الصحيح حسب الدور
    // =====================================================
    let office_id = null;

    if (activeRole === "self_office_admin") {
      // مكتب المالك الخاص فقط
      const q = await client.query(
        `SELECT id FROM offices 
         WHERE owner_id = $1 AND is_owner_office = true
         LIMIT 1`,
        [userId]
      );
      office_id = q.rows[0]?.id || null;
    }

    else if (["office", "office_admin"].includes(activeRole)) {
      // المكتب الحقيقي فقط
      const q = await client.query(
        `SELECT id FROM offices 
         WHERE owner_id = $1 AND is_owner_office = false
         LIMIT 1`,
        [userId]
      );
      office_id = q.rows[0]?.id || null;

      // إذا كان موظف مكتب
      if (!office_id) {
        const q2 = await client.query(
          `SELECT office_id FROM office_users WHERE user_id = $1 LIMIT 1`,
          [userId]
        );
        office_id = q2.rows[0]?.office_id || null;
      }
    }

    // =====================================================
    // 🎯 2️⃣ fallback من العقد > العقار > الوحدة
    // =====================================================
    if (!office_id && contract_id) {
      const q = await client.query(
        `SELECT office_id FROM contracts WHERE id = $1 LIMIT 1`,
        [contract_id]
      );
      office_id = q.rows[0]?.office_id || office_id;
    }

    if (!office_id && property_id) {
      const q = await client.query(
        `SELECT office_id FROM properties WHERE id = $1 LIMIT 1`,
        [property_id]
      );
      office_id = q.rows[0]?.office_id || office_id;
    }

    if (!office_id && unit_id) {
      const q = await client.query(
        `SELECT p.office_id 
         FROM units u 
         JOIN properties p ON p.id = u.property_id 
         WHERE u.id = $1 LIMIT 1`,
        [unit_id]
      );
      office_id = q.rows[0]?.office_id || office_id;
    }

    // =====================================================
    // 🚨 تحقق نهائي
    // =====================================================
    if (!office_id) {
      return res.status(400).json({
        success: false,
        message: "❌ لا يمكن تحديد المكتب المرتبط بالسند.",
      });
    }

    // =====================================================
    // 🧾 إضافة السند
    // =====================================================
    const receiptRes = await client.query(
      `
      INSERT INTO receipts (
        receipt_type, reference_no, property_id, unit_id, contract_id, office_id,
        description, amount, payer, receiver, payment_method, date, reason, created_at
      ) 
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
      RETURNING id, contract_id, amount
      `,
      [
        receipt_type || type || "قبض",
        ref,
        property_id || null,
        unit_id || null,
        contract_id || null,
        office_id,
        notes || description || "",
        Number(amount) || 0,
        payer_name || payer || "غير محدد",
        receiver_name || receiver || "غير محدد",
        payment_method || "تحويل",
        date || new Date(),
        reason || "أخرى",
      ]
    );

    // =====================================================
    // 💰 تحديث الدفعات (إن وجد)
    // =====================================================
    const { contract_id: cid, amount: totalPaid } = receiptRes.rows[0];

    if (cid && totalPaid > 0) {
      let remaining = Number(totalPaid);
      const { rows: dues } = await client.query(
        `
        SELECT id, amount, COALESCE(paid_amount, 0) AS paid_amount
        FROM payments 
        WHERE contract_id = $1 
          AND (status IS NULL OR status NOT IN ('مدفوعة', 'Cancelled', 'paid'))
        ORDER BY due_date ASC;
        `,
        [cid]
      );

      for (const p of dues) {
        if (remaining <= 0) break;
        const left = p.amount - p.paid_amount;
        const toPay = Math.min(remaining, left);

        await client.query(
          `
          UPDATE payments
          SET paid_amount = paid_amount + $1,
              status = CASE 
                WHEN paid_amount + $1 >= amount THEN 'مدفوعة'
                ELSE 'جزئية'
              END,
              receipt_id = $2
          WHERE id = $3;
          `,
          [toPay, receiptRes.rows[0].id, p.id]
        );

        remaining -= toPay;
      }
    }

    await client.query("COMMIT");

    res.json({
      success: true,
      receipt_id: receiptRes.rows[0].id,
      reference_no: ref,
      office_id,
      message: "✅ تم حفظ السند وربطه بالمكتب الصحيح",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error saving receipt:", err);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء حفظ السند.",
      details: err.message,
    });
  } finally {
    client.release();
  }
});




export default router;
