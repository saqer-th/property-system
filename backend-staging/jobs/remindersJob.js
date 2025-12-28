import cron from "node-cron";
import pool from "../db/pool.js";
// import { sendWhatsAppMessage } from "../utils/whatsappClient.js"; // لاحقاً

/* =========================================================
   🔄 Job: فحص التذكيرات التلقائية وإرسالها يوميًا
   ========================================================= */
export function startRemindersJob() {
  // ⏰ كل يوم الساعة 9 صباحًا
  cron.schedule("0 9 * * *", async () => {
    console.log("🕘 Running daily reminders job...");

    try {
      // جلب جميع التذكيرات الفعالة
      const { rows: reminders } = await pool.query(
        `SELECT * FROM reminder_templates WHERE is_active=true`
      );

      for (const reminder of reminders) {
        const { id, office_id, trigger_event, days_before, message_text } = reminder;

        if (trigger_event === "payment_due") {
          await handlePaymentDueReminders(reminder);
        }

        if (trigger_event === "contract_end") {
          await handleContractEndReminders(reminder);
        }

        // 🔹 يمكن نضيف لاحقاً: maintenance_due, payment_overdue, إلخ.
      }
    } catch (err) {
      console.error("❌ Reminder job error:", err);
    }
  });
}

/* =========================================================
   💰 1. تذكير الدفعات المستحقة قريباً
   ========================================================= */
async function handlePaymentDueReminders(reminder) {
  const { id: reminderId, office_id, days_before, message_text } = reminder;

  // نحدد التاريخ المطلوب
  const today = new Date();
  const targetDate = new Date();
  targetDate.setDate(today.getDate() + days_before);

  try {
    const { rows: payments } = await pool.query(
      `
      SELECT p.id, p.due_date, p.amount, c.id AS contract_id, t.name AS tenant_name, t.phone AS tenant_phone
      FROM payments p
      JOIN contracts c ON c.id = p.contract_id
      JOIN users t ON t.id = c.tenant_id
      WHERE c.office_id = $1
        AND p.status != 'paid'
        AND DATE(p.due_date) = DATE($2)
      `,
      [office_id, targetDate]
    );

    for (const pay of payments) {
      const msg = message_text
        .replace("{{name}}", pay.tenant_name)
        .replace("{{amount}}", pay.amount)
        .replace("{{due_date}}", pay.due_date.toLocaleDateString("ar-SA"));

      console.log(`📩 Reminder → ${pay.tenant_phone}: ${msg}`);

      // لاحقاً → await sendWhatsAppMessage(pay.tenant_phone, msg);

      await pool.query(
        `INSERT INTO reminder_logs (reminder_id, target_user_id, target_phone, message_sent)
         VALUES ($1,$2,$3,$4)`,
        [reminderId, pay.tenant_id, pay.tenant_phone, msg]
      );
    }
  } catch (err) {
    console.error("❌ payment_due reminder error:", err);
  }
}

/* =========================================================
   🏠 2. تذكير العقود التي أوشكت على الانتهاء
   ========================================================= */
async function handleContractEndReminders(reminder) {
  const { id: reminderId, office_id, days_before, message_text } = reminder;

  const today = new Date();
  const targetDate = new Date();
  targetDate.setDate(today.getDate() + days_before);

  try {
    const { rows: contracts } = await pool.query(
      `
      SELECT c.id, c.end_date, u.name AS tenant_name, u.phone AS tenant_phone
      FROM contracts c
      JOIN users u ON u.id = c.tenant_id
      WHERE c.office_id = $1
        AND DATE(c.end_date) = DATE($2)
      `,
      [office_id, targetDate]
    );

    for (const c of contracts) {
      const msg = message_text
        .replace("{{name}}", c.tenant_name)
        .replace("{{end_date}}", c.end_date.toLocaleDateString("ar-SA"));

      console.log(`📩 Contract Reminder → ${c.tenant_phone}: ${msg}`);

      // لاحقاً → await sendWhatsAppMessage(c.tenant_phone, msg);

      await pool.query(
        `INSERT INTO reminder_logs (reminder_id, target_user_id, target_phone, message_sent)
         VALUES ($1,$2,$3,$4)`,
        [reminderId, null, c.tenant_phone, msg]
      );
    }
  } catch (err) {
    console.error("❌ contract_end reminder error:", err);
  }
}
