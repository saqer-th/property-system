// ===============================================
// 📩 routes/reminders.js (نسخة محسّنة)
// ===============================================
import express from "express";
import pool from "../db/pool.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { sendWhatsAppMessage } from "../utils/whatsappClient.js";

const router = express.Router();

/* =========================================================
   🧠 Helper: استبدال المتغيرات داخل القالب (ذكي)
   ========================================================= */
function fillTemplate(template, data) {
  return template.replace(/\{\{(.*?)\}\}/g, (_, key) => {
    const k = key.trim();
    const val = data[k];
    if (val instanceof Date) return val.toLocaleDateString("ar-SA");
    if (typeof val === "number") return val.toLocaleString("ar-SA");
    return val ?? "";
  });
}

/* =========================================================
   🔍 Helper: التحقق من صلاحية المستخدم على العقد
   ========================================================= */
async function checkContractAccess(contractId, userId) {
  const { rows } = await pool.query(
    `
    SELECT 1 FROM contracts c
    WHERE c.contract_no = $1
      AND (
        c.office_id IN (SELECT id FROM offices WHERE owner_id = $2)
        OR c.office_id IN (SELECT office_id FROM office_users WHERE user_id = $2)
      )
    LIMIT 1
    `,
    [contractId, userId]
  );
  return rows.length > 0;
}

/* =========================================================
   📜 1️⃣ جلب القوالب الجاهزة فقط (النظامية)
   ========================================================= */
router.get("/templates", verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, trigger_event, template, channel 
       FROM reminder_templates 
       WHERE office_id IS NULL AND is_active=true
       ORDER BY created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("❌ fetch templates error:", err);
    res.status(500).json({ success: false, message: "فشل تحميل القوالب" });
  }
});

/* =========================================================
   👁️ 2️⃣ معاينة الرسالة الذكية (تحسب رقم الدفعة تلقائيًا)
   ========================================================= */
router.post("/preview", verifyToken, async (req, res) => {
  const { template_id, contract_id } = req.body;
  const sender = req.user;

  if (!template_id || !contract_id)
    return res.status(400).json({
      success: false,
      message: "يجب تحديد القالب ورقم العقد",
    });

  try {
    // ✅ تحقق من الصلاحية
    const hasAccess = await checkContractAccess(contract_id, sender.id);
    if (!hasAccess)
      return res
        .status(403)
        .json({ success: false, message: "❌ لا تملك صلاحية على هذا العقد" });

    // 🧩 جلب القالب
    const { rows: tmplRows } = await pool.query(
      "SELECT * FROM reminder_templates WHERE id=$1",
      [template_id]
    );
    if (!tmplRows.length)
      return res
        .status(404)
        .json({ success: false, message: "القالب غير موجود" });
    const template = tmplRows[0];

    // 🧠 منطق لتحديد نوع الدفعة المطلوبة حسب القالب
    let paymentCondition = "";
    switch (template.trigger_event) {
      case "payment_due":
        paymentCondition = "np.status IN ('غير مدفوعة', 'جزئية')";
        break;
      case "payment_received":
        paymentCondition = "np.status = 'مدفوعة'";
        break;
      default:
        paymentCondition = "1=1"; // لبقية القوالب (مثل انتهاء عقد)
    }

    // 🧾 جلب العقد + المستأجر + الدفعة المناسبة + رقمها
    const { rows } = await pool.query(
      `
      WITH numbered_payments AS (
        SELECT 
          id AS payment_id,
          contract_id,
          amount,
          COALESCE(paid_amount, 0) AS paid_amount,
          (amount - COALESCE(paid_amount, 0)) AS remaining_amount,
          due_date,
          status,
          ROW_NUMBER() OVER (PARTITION BY contract_id ORDER BY due_date ASC, id ASC) AS installment_number
        FROM payments
      )
      SELECT 
        c.id,
        c.contract_no,
        c.total_contract_value,
        c.tenancy_start,
        c.tenancy_end,
        p.property_type AS property_name,
        o.id AS office_id,
        o.name AS office_name,
        pt.name AS tenant_name,
        pt.phone AS tenant_phone,
        np.payment_id,
        np.amount AS due_amount,
        np.paid_amount,
        np.remaining_amount,
        np.due_date AS next_due_date,
        np.status AS payment_status,
        np.installment_number
      FROM contracts c
      LEFT JOIN properties p ON p.id = c.property_id
      LEFT JOIN offices o ON o.id = c.office_id
      LEFT JOIN contract_parties cp ON cp.contract_id = c.id 
           AND LOWER(TRIM(cp.role)) IN ('tenant','مستأجر','مستاجر')
      LEFT JOIN parties pt ON pt.id = cp.party_id
      LEFT JOIN numbered_payments np ON np.contract_id = c.id
           AND ${paymentCondition}
      WHERE c.contract_no = $1
        AND (
          c.office_id IN (SELECT id FROM offices WHERE owner_id = $2)
          OR c.office_id IN (SELECT office_id FROM office_users WHERE user_id = $2)
        )
      ORDER BY np.due_date ASC
      LIMIT 1;
      `,
      [contract_id, sender.id]
    );

    if (!rows.length)
      return res.status(404).json({
        success: false,
        message: "لم يتم العثور على دفعة مناسبة لهذا القالب أو العقد",
      });

    const contract = rows[0];

    // 🧩 تعبئة القالب بالبيانات
    const msg = fillTemplate(template.template, {
      name: contract.tenant_name,
      tenant_name: contract.tenant_name,
      contract_number: contract.contract_no,
      installment_number: contract.installment_number || 1,
      amount: contract.due_amount?.toLocaleString("ar-SA") || "غير محدد",
      due_date: contract.next_due_date
        ? new Date(contract.next_due_date).toLocaleDateString("ar-SA")
        : "غير محدد",
      property: contract.property_name,
      start_date: new Date(contract.tenancy_start),
      end_date: new Date(contract.tenancy_end),
      paid_amount: contract.paid_amount?.toLocaleString("ar-SA") || "0",
      remaining_amount: contract.remaining_amount?.toLocaleString("ar-SA") || "0",
      payment_status: contract.payment_status || "غير محدد",
    });

    const signature = `\n\n📩 هذه الرسالة من مكتب ${contract.office_name} بواسطة ${sender.name}`;
    const preview = msg + signature;

    res.json({
      success: true,
      preview,
      contract: {
        id: contract.id,
        tenant_name: contract.tenant_name,
        tenant_phone: contract.tenant_phone,
        property_name: contract.property_name,
        due_amount: contract.due_amount,
        paid_amount: contract.paid_amount,
        remaining_amount: contract.remaining_amount,
        installment_number: contract.installment_number,
        payment_status: contract.payment_status,
        next_due_date: contract.next_due_date,
      },
    });
  } catch (err) {
    console.error("❌ preview reminder error:", err);
    res.status(500).json({
      success: false,
      message: "فشل إنشاء المعاينة",
      details: err.message,
    });
  }
});



/* =========================================================
   📤 3️⃣ إرسال الرسالة فعليًا + حفظ في السجل (نسخة محسّنة)
   ========================================================= */
router.post("/send", verifyToken, async (req, res) => {
  const { template_id, contract_id } = req.body;
  const sender = req.user;

  if (!template_id || !contract_id)
    return res
      .status(400)
      .json({ success: false, message: "يجب تحديد القالب ورقم العقد" });

  try {
    // ✅ تحقق من الصلاحية
    const hasAccess = await checkContractAccess(contract_id, sender.id);
    if (!hasAccess)
      return res
        .status(403)
        .json({ success: false, message: "❌ لا تملك صلاحية على هذا العقد" });

    // 🧩 جلب القالب + بيانات العقد + بيانات المستأجر + تفاصيل الدفعة القادمة
    const { rows } = await pool.query(
      `
      SELECT 
        c.id,
        c.contract_no,
        c.total_contract_value,
        c.tenancy_start,
        c.tenancy_end,
        p.property_type AS property_name,
        o.id AS office_id,
        o.name AS office_name,
        pt.id AS tenant_id,
        pt.name AS tenant_name,
        pt.phone AS tenant_phone,
        rt.template,
        rt.channel,
        pay.id AS payment_id,
        pay.amount AS due_amount,
        COALESCE(pay.paid_amount, 0) AS paid_amount,
        (pay.amount - COALESCE(pay.paid_amount, 0)) AS remaining_amount,
        pay.due_date AS next_due_date
      FROM contracts c
      LEFT JOIN properties p ON p.id = c.property_id
      LEFT JOIN offices o ON o.id = c.office_id
      LEFT JOIN contract_parties cp ON cp.contract_id = c.id 
           AND LOWER(TRIM(cp.role)) IN ('tenant','مستأجر','مستاجر')
      LEFT JOIN parties pt ON pt.id = cp.party_id
      JOIN reminder_templates rt ON rt.id = $1
      LEFT JOIN payments pay ON pay.contract_id = c.id 
           AND pay.status IN ('due','partially_paid') -- الدفعات القادمة أو الجزئية فقط
      WHERE c.contract_no = $2
        AND (
          c.office_id IN (SELECT id FROM offices WHERE owner_id = $3)
          OR c.office_id IN (SELECT office_id FROM office_users WHERE user_id = $3)
        )
      ORDER BY pay.due_date ASC
      LIMIT 1;
      `,
      [template_id, contract_id, sender.id]
    );

    if (!rows.length)
      return res
        .status(404)
        .json({ success: false, message: "العقد أو القالب غير موجود أو لا يوجد دفعات قادمة" });

    const data = rows[0];

    // 🧾 تجهيز المتغيرات للقالب
    const msgBody = fillTemplate(data.template, {
      tenant_name: data.tenant_name,
      contract_number: data.contract_no,
      property: data.property_name,
      start_date: new Date(data.tenancy_start),
      end_date: new Date(data.tenancy_end),
      due_amount: data.due_amount?.toLocaleString("ar-SA") || "غير محدد",
      paid_amount: data.paid_amount?.toLocaleString("ar-SA") || "0",
      remaining_amount: data.remaining_amount?.toLocaleString("ar-SA") || "0",
      next_due_date: data.next_due_date
        ? new Date(data.next_due_date).toLocaleDateString("ar-SA")
        : "غير محدد",
    });

    // ✍️ توقيع الرسالة
    const finalMessage = `${msgBody}\n\n📩 هذه الرسالة من مكتب ${data.office_name} بواسطة ${sender.name}`;

    let status = "sent";
    let error_message = null;

    try {
      // 🚀 إرسال واتساب (أو SMS لاحقاً)
      console.log("📤 WhatsApp Message To:", data.tenant_phone);
      console.log("💬", finalMessage);
      await sendWhatsAppMessage(data.tenant_phone, finalMessage);
    } catch (err) {
      status = "failed";
      error_message = err.message;
    }

    // 🧾 حفظ في سجل التذكيرات
    await pool.query(
      `
      INSERT INTO reminder_logs 
      (reminder_id, office_id, contract_id, target_phone, message_sent, channel, status, sent_by, sent_by_name, error_message)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      `,
      [
        template_id,
        data.office_id,
        data.id,
        data.tenant_phone,
        finalMessage,
        data.channel || "whatsapp",
        status,
        sender.id,
        sender.name,
        error_message,
      ]
    );

    // ✅ الرد النهائي
    res.json({
      success: true,
      message:
        status === "sent"
          ? "✅ تم إرسال التذكير بنجاح"
          : "⚠️ فشل الإرسال",
      sent_to: data.tenant_phone,
      payment_info: {
        due_amount: data.due_amount,
        paid_amount: data.paid_amount,
        remaining_amount: data.remaining_amount,
        next_due_date: data.next_due_date,
      },
      status,
    });
  } catch (err) {
    console.error("❌ send reminder error:", err);
    res.status(500).json({
      success: false,
      message: "فشل إرسال التذكير",
      details: err.message,
    });
  }
});


/* =========================================================
   🧾 4️⃣ سجل التذكيرات (حسب المكتب)
   ========================================================= */
router.get("/logs", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id;

    const { rows: officeRows } = await pool.query(
      `
      SELECT id FROM offices WHERE owner_id=$1
      UNION
      SELECT office_id AS id FROM office_users WHERE user_id=$1
      LIMIT 1
      `,
      [userId]
    );

    if (!officeRows.length)
      return res
        .status(404)
        .json({ success: false, message: "لم يتم العثور على مكتب مرتبط بالحساب" });

    const officeId = officeRows[0].id;

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
      WHERE rl.office_id::bigint = $1::bigint
      ORDER BY rl.created_at DESC
      `,
      [officeId]
    );
    console.log(officeId, rows.length);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("❌ fetch logs error:", err);
    res.status(500).json({ success: false, message: "فشل تحميل سجل الرسائل" });
  }
});

export default router;
