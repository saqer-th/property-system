// ===============================================
// 📩 routes/reminders.js (نسخة محسّنة)
// ===============================================
import express from "express";
import pool from "../db/pool.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { sendWhatsAppMessage } from "../utils/whatsappClient.js";

const router = express.Router();




/* =============================
   🔧 Fill Template Helper
============================= */
function fillTemplate(template, data) {
  return template.replace(/\{\{(.*?)\}\}/g, (_, key) => {
    const k = key.trim();
    const val = data[k];
    if (!val) return "";
    if (val instanceof Date) return val.toLocaleDateString("ar-SA");
    if (typeof val === "number") return val.toLocaleString("ar-SA");
    return String(val);
  });
}

/* =============================
   🔐 Check Contract Access
============================= */
async function checkContractAccess(contractNo, userId, role, phone) {
  // admin → full access
  if (role === "admin") return true;

  // office roles
  if (["office", "office_admin"].includes(role)) {
    const { rows } = await pool.query(
      `
      SELECT 1
      FROM contracts c
      WHERE c.id = $1
        AND (
          c.office_id IN (SELECT id FROM offices WHERE owner_id = $2 AND is_owner_office = false)
          OR c.office_id IN (SELECT office_id FROM office_users WHERE user_id = $2)
        )
      LIMIT 1
      `,
      [contractNo, userId]
    );
    return rows.length > 0;
  }

  // self-managed owner
  if (role === "self_office_admin") {
    const { rows } = await pool.query(
      `
      SELECT 1
      FROM contracts c
      WHERE c.id = $1
        AND c.office_id = (
          SELECT id FROM offices
          WHERE owner_id = $2 AND is_owner_office = true
          LIMIT 1
        )
      LIMIT 1
      `,
      [contractNo, userId]
    );
    return rows.length > 0;
  }

  return false;
}

/* =============================
   📌 Get Payment Based On Template (Final Version)
============================= */
/* =============================
   📌 Get Payment Based On Template (Final Master Version)
============================= */
async function getPaymentForTemplate(trigger, contractId) {

  /* -----------------------------------------------
     1) 🔔 payment_due → أول دفعة غير مدفوعة بالكامل
  ----------------------------------------------- */
  if (trigger === "payment_due") {
    return await pool.query(
      `
      SELECT 
        p.id,
        ROW_NUMBER() OVER (ORDER BY p.due_date ASC) AS installment_number,
        p.amount,
        p.paid_amount,
        (p.amount - p.paid_amount) AS remaining_amount,
        p.due_date,
        p.status
      FROM payments p
      WHERE p.contract_id = $1
        AND (p.amount - p.paid_amount) > 0
      ORDER BY p.due_date ASC          -- أول دفعة غير مدفوعة
      LIMIT 1
      `,
      [contractId]
    );
  }

  /* -------------------------------------------------------
     2) ⏰ payment_overdue → آخر دفعة متأخرة (غير مدفوعة)
  ------------------------------------------------------- */
  if (trigger === "payment_overdue") {
    return await pool.query(
      `
      SELECT 
        p.id,
        ROW_NUMBER() OVER (ORDER BY p.due_date ASC) AS installment_number,
        p.amount,
        p.paid_amount,
        (p.amount - p.paid_amount) AS remaining,
        p.due_date,
        p.status
      FROM payments p
      WHERE p.contract_id = $1
        AND p.due_date < CURRENT_DATE         -- متأخرة
        AND (p.amount - p.paid_amount) > 0    -- غير مدفوعة أو جزئياً
      ORDER BY p.due_date DESC                -- 🔥 آخر دفعة متأخرة
      LIMIT 1
      `,
      [contractId]
    );
  }

  /* -------------------------------------------------------
     3) 💸 payment_received → آخر دفعة مدفوعة (سند قبض)
  ------------------------------------------------------- */
    if (trigger === "payment_received") {

      // آخر سند قبض
      const receiptResult = await pool.query(
        `
        SELECT 
          reference_no AS receipt_ref,
          amount,
          date AS paid_at
        FROM receipts
        WHERE contract_id = $1
          AND receipt_type = 'قبض'
        ORDER BY date DESC, reference_no DESC
        LIMIT 1
        `,
        [contractId]
      );

      const receipt = receiptResult.rows[0];
      if (!receipt) return { rows: [] };

      return {
        rows: [
          {
            receipt_ref: receipt.receipt_ref,
            amount: receipt.amount,
            paid_amount: receipt.amount,
            paid_at: receipt.paid_at,
          },
        ],
      };
    }


  /* -------------------------------------------------------
     4) 🧾 new_payment_recorded → آخر إيصال قبض مسجّل
  ------------------------------------------------------- */
  if (trigger === "new_payment_recorded") {
    return await pool.query(
      `
      SELECT 
        r.id AS receipt_id,
        r.amount,
        r.date AS paid_at,
        r.payment_id
      FROM receipts r
      WHERE r.contract_id = $1
        AND r.receipt_type = 'قبض'
      ORDER BY r.date DESC, r.id DESC
      LIMIT 1
      `,
      [contractId]
    );
  }

  /* في حال التريقر غير معروف */
  return { rows: [] };
}


/* =============================
   📌 Preview Reminder
============================= */
router.post("/preview", verifyToken, async (req, res) => {
  const { template_id, contract_id } = req.body;
  const sender = req.user;

  if (!template_id || !contract_id)
    return res.status(400).json({
      success: false,
      message: "يجب اختيار القالب ورقم العقد",
    });

  try {
    /* ---------------------------
       1) Load Template
    --------------------------- */
    const { rows: tmplRows } = await pool.query(
      `SELECT * FROM reminder_templates WHERE id=$1`,
      [template_id]
    );

    if (!tmplRows.length)
      return res.status(404).json({
        success: false,
        message: "القالب غير موجود",
      });

    const template = tmplRows[0];

    /* ---------------------------
       2) Access Check
    --------------------------- */
    const allowed = await checkContractAccess(
      contract_id,
      sender.id,
      sender.activeRole,
      sender.phone
    );

    if (!allowed)
      return res.status(403).json({
        success: false,
        message: "❌ لا تملك صلاحية عرض هذا العقد",
      });

    /* ---------------------------
       3) Load Contract Data
    --------------------------- */
    const { rows: contractRows } = await pool.query(
      `
      SELECT 
        c.*,
        o.name AS office_name,
        p.property_type AS property_name,
        t.name AS tenant_name,
        t.phone AS tenant_phone
      FROM contracts c
      LEFT JOIN offices o ON o.id = c.office_id
      LEFT JOIN properties p ON p.id = c.property_id
      LEFT JOIN contract_parties cp 
        ON cp.contract_id = c.id AND LOWER(cp.role) LIKE '%tenant%'
      LEFT JOIN parties t ON t.id = cp.party_id
      WHERE c.id = $1
      LIMIT 1
      `,
      [contract_id]
    );

    if (!contractRows.length)
      return res.status(404).json({
        success: false,
        message: "العقد غير موجود",
      });

    const contract = contractRows[0];

    /* ---------------------------
       4) Load Payment For Template
    --------------------------- */
    const paymentResult = await getPaymentForTemplate(
      template.trigger_event,
      contract.id
    );

    const payment = paymentResult.rows[0] || null;

    /* ---------------------------
       5) Prepare Vars For Template
    --------------------------- */
    const vars = {
      tenant_name: contract.tenant_name || "-",
      receipt_ref: payment?.receipt_ref || "-",
      installment_number: payment?.installment_number || "-",
      office_name: contract.office_name || "-",

      amount: Number(payment?.amount || 0).toLocaleString("en-US", {
        minimumFractionDigits: 2,
      }),

      paid: Number(payment?.paid_amount || 0).toLocaleString("en-US", {
        minimumFractionDigits: 2,
      }),

      remaining: Number(
        payment?.remaining_amount || (payment?.amount - payment?.paid_amount) || 0
      ).toLocaleString("en-US", {
        minimumFractionDigits: 2,
      }),
      remaining_amount: Number(
        payment?.remaining_amount || (payment?.amount - payment?.paid_amount) || 0
      ).toLocaleString("en-US", {
        minimumFractionDigits: 2,
      }),
      due_date: payment?.due_date
        ? new Date(payment.due_date).toLocaleDateString("en-GB") // يعطي 17/09/2022
        : "-",

      contract_number: contract.contract_no,

      end_date: contract.tenancy_end
        ? new Date(contract.tenancy_end).toLocaleDateString("en-GB")
        : "-",

      payment_date: payment?.paid_at
        ? new Date(payment.paid_at).toLocaleDateString("en-GB")
        : "-",
    };


    /* ---------------------------
       6) Fill Template With Vars
    --------------------------- */
    const preview = fillTemplate(template.template, vars);

    /* ---------------------------
       7) Return Preview
    --------------------------- */
    res.json({
      success: true,
      preview,
      contract,
      payment,
    });
  } catch (err) {
    console.error("❌ Preview Error:", err);
    res.status(500).json({
      success: false,
      message: "خطأ أثناء توليد المعاينة",
      details: err.message,
    });
  }
});


/* =============================
   📌 Send Reminder
============================= */
router.post("/send", verifyToken, async (req, res) => {
  const { template_id, contract_id } = req.body;
  const sender = req.user;

  try {
    // 🧩 Load template
    const { rows: tmplRows } = await pool.query(
      `SELECT * FROM reminder_templates WHERE id=$1`,
      [template_id]
    );
    const template = tmplRows[0];

    // 🛡 Access check
    const allowed = await checkContractAccess(
      contract_id,
      sender.id,
      sender.activeRole,
      sender.phone
    );

    if (!allowed)
      return res.status(403).json({
        success: false,
        message: "❌ لا تملك صلاحية الإرسال لهذا العقد",
      });

    // 🏷 Contract data
    const { rows: contractRows } = await pool.query(
      `
      SELECT 
        c.*, 
        o.name AS office_name,
        p.property_type AS property_name,
        t.name AS tenant_name,
        t.phone AS tenant_phone
      FROM contracts c
      LEFT JOIN offices o ON o.id = c.office_id
      LEFT JOIN properties p ON p.id = c.property_id
      LEFT JOIN contract_parties cp ON cp.contract_id = c.id AND LOWER(cp.role) LIKE '%tenant%'
      LEFT JOIN parties t ON t.id = cp.party_id
      WHERE c.id = $1
      LIMIT 1
      `,
      [contract_id]
    );
    const contract = contractRows[0];

    // 💰 Payment
    const paymentResult = await getPaymentForTemplate(
      template.trigger_event,
      contract.id
    );
    const payment = paymentResult.rows[0] || {};

    // 🧩 Variables for template
    const vars = {
      name: contract.tenant_name || "",
      tenant_name: contract.tenant_name || "",
      contract_number: contract.contract_no || "",
      office_name: contract.office_name || "",
      property: contract.property_name || "",
      sender_name: sender.name || "", // ⭐ مهم
      start_date: contract.tenancy_start
        ? new Date(contract.tenancy_start).toLocaleDateString("en-GB")
        : "",
      end_date: contract.tenancy_end
        ? new Date(contract.tenancy_end).toLocaleDateString("en-GB")
        : "",
      amount: payment.amount || 0,
      remaining_amount: payment.remaining_amount || (payment.amount - payment.paid_amount) || "",
      due_date: payment.due_date
        ? new Date(payment.due_date).toLocaleDateString("en-GB")
        : "",
      payment_date: payment.paid_at
        ? new Date(payment.paid_at).toLocaleDateString("en-GB")
        : "",
    };

    // 📝 Fill template
    const filled = fillTemplate(template.template, vars);

    // ✨ Signature (sender)
    let finalMessage =
      filled +
      `\n\n📩 أُرسلت من مكتب ${contract.office_name} بواسطة ${sender.name}`;

    // 🔄 Fix escaped \n → actual newlines
    finalMessage = finalMessage.replace(/\\n/g, "\n");

    // 📤 Send WhatsApp
    let status = "sent";
    let error_message = null;

    try {
      await sendWhatsAppMessage(contract.tenant_phone, finalMessage);
    } catch (err) {
      status = "failed";
      error_message = err.message;
    }

    // 🧾 Save log
    await pool.query(
      `
      INSERT INTO reminder_logs 
      (reminder_id, office_id, contract_id, target_phone, message_sent, channel, status, sent_by, sent_by_name, error_message)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      `,
      [
        template_id,
        contract.office_id,
        contract.id,
        contract.tenant_phone,
        finalMessage,
        template.channel,
        status,
        sender.id,
        sender.name,
        error_message,
      ]
    );

    res.json({
      success: true,
      status,
      message: status === "sent" ? "✅ تم الإرسال" : "⚠️ فشل الإرسال",
    });
  } catch (err) {
    console.error("❌ Send Error:", err);
    res.status(500).json({
      success: false,
      message: "خطأ أثناء إرسال التذكير",
      details: err.message,
    });
  }
});



/* ============================================================
   1) جلب القوالب الجاهزة
============================================================ */
router.get("/templates", verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, name, template, available_vars, channel 
      FROM reminder_templates
      ORDER BY id ASC;
    `);

    res.json({ success: true, templates: rows });
  } catch (err) {
    console.error("❌ templates error:", err);
    res.status(500).json({ success: false, message: "خطأ أثناء تحميل القوالب" });
  }
});



/* =========================================================
   🧾 4️⃣ سجل التذكيرات (حسب المكتب)
   ========================================================= */
router.get("/logs", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const activeRole = req.user?.activeRole;

    /* ============================================================
       🅰️ 1) ADMIN → كل السجلات
    ============================================================ */
    if (activeRole === "admin") {
      const { rows } = await pool.query(`
        SELECT 
          rl.id,
          rl.created_at,
          rl.status,
          rl.target_phone,
          rl.message_sent,
          rl.sent_by_name,
          rl.error_message,
          rt.name AS reminder_name,
          c.contract_no,
          p.property_type AS property_name,
          o.name AS office_name
        FROM reminder_logs rl
        LEFT JOIN reminder_templates rt ON rt.id = rl.reminder_id
        LEFT JOIN contracts c ON c.id = rl.contract_id
        LEFT JOIN properties p ON p.id = c.property_id
        LEFT JOIN offices o ON o.id = rl.office_id
        ORDER BY rl.created_at DESC
      `);

      return res.json({ success: true, admin: true, data: rows });
    }

    /* ============================================================
       🅱️ 2) self_office_admin → مكتب واحد فقط
    ============================================================ */
    if (activeRole === "self_office_admin") {
      const { rows: ownerOffice } = await pool.query(
        `
        SELECT id 
        FROM offices 
        WHERE owner_id = $1 AND is_owner_office = true
        LIMIT 1
        `,
        [userId]
      );

      if (!ownerOffice.length) {
        return res.status(404).json({
          success: false,
          message: "لم يتم العثور على مكتب المالك",
        });
      }

      const officeId = ownerOffice[0].id;

      const { rows } = await pool.query(
        `
        SELECT 
          rl.id,
          rl.created_at,
          rl.status,
          rl.target_phone,
          rl.message_sent,
          rl.sent_by_name,
          rl.error_message,
          rt.name AS reminder_name,
          c.contract_no,
          p.property_type AS property_name
        FROM reminder_logs rl
        LEFT JOIN reminder_templates rt ON rt.id = rl.reminder_id
        LEFT JOIN contracts c ON c.id = rl.contract_id
        LEFT JOIN properties p ON p.id = c.property_id
        WHERE rl.office_id = $1
        ORDER BY rl.created_at DESC
        `,
        [officeId]
      );

      return res.json({
        success: true,
        office_id: officeId,
        data: rows,
      });
    }

    /* ============================================================
       🅾️ 3) office / office_admin
    ============================================================ */
    const { rows: officeRows } = await pool.query(
      `
      SELECT id
      FROM offices 
      WHERE owner_id = $1 AND is_owner_office = false

      UNION

      SELECT office_id 
      FROM office_users 
      WHERE user_id = $1
      `,
      [userId]
    );

    if (!officeRows.length) {
      return res.status(404).json({
        success: false,
        message: "لم يتم العثور على مكتب مرتبط بالحساب",
      });
    }

    const officeIds = officeRows.map((o) => o.id);

    const { rows } = await pool.query(
      `
      SELECT 
        rl.id,
        rl.created_at,
        rl.status,
        rl.target_phone,
        rl.message_sent,
        rl.sent_by_name,
        rl.error_message,
        rt.name AS reminder_name,
        c.contract_no,
        p.property_type AS property_name
      FROM reminder_logs rl
      LEFT JOIN reminder_templates rt ON rt.id = rl.reminder_id
      LEFT JOIN contracts c ON c.id = rl.contract_id
      LEFT JOIN properties p ON p.id = c.property_id
      WHERE rl.office_id = ANY($1::bigint[])
      ORDER BY rl.created_at DESC
      `,
      [officeIds]
    );

    return res.json({
      success: true,
      offices: officeIds,
      data: rows,
    });

  } catch (err) {
    console.error("❌ fetch logs error:", err);
    res.status(500).json({
      success: false,
      message: "فشل تحميل سجل الرسائل",
    });
  }
});



export default router;
