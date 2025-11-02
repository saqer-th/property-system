import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;

// ✅ إعداد الاتصال مع خيارات أمان وأداء محسّنة
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://postgres:123456@localhost:5432/property_system",
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,

  // 🧩 تحسينات إضافية للاستقرار
  max: 10,                     // أقصى عدد اتصالات مفتوحة
  idleTimeoutMillis: 30000,    // يغلق الاتصال بعد 30 ثانية من الخمول
  connectionTimeoutMillis: 10000, // مهلة محاولة الاتصال 10 ثوانٍ
});

// 🧠 التعامل مع أي خطأ مفاجئ دون إيقاف الخادم
pool.on("error", (err) => {
  console.error("⚠️ Unexpected PostgreSQL error:", err.message);
});

// 🧩 اختبار الاتصال عند التشغيل
(async () => {
  try {
    const client = await pool.connect();
    console.log("✅ PostgreSQL connected successfully");
    client.release();
  } catch (err) {
    console.error("❌ PostgreSQL connection error:", err.message);
  }
})();

export default pool;
