// =======================================
// 🏗️ Property Management System - Server
// =======================================

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "pg";
import bodyParser from "body-parser";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { verifyToken } from "./middleware/authMiddleware.js";
import { autoAudit } from "./middleware/autoAudit.js";
import { initWhatsAppClient } from "./utils/whatsappClient.js";

// ✅ تحميل المتغيرات من .env
dotenv.config();

// =======================================
// 🗄️ إعداد قاعدة البيانات PostgreSQL
// =======================================
const { Pool } = pkg;
export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://postgres:123456@localhost:5432/property_system",
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
});

// =======================================
// ⚙️ إعداد الخادم Express
// =======================================
const app = express();

// 🔹 تعريف الدومينات المسموح بها
const allowedOrigins = [
  "http://localhost:5173",
  "https://property-system-pi.vercel.app",
  "https://staging.f4lcon.tech"
];

// ✅ تفعيل CORS بطريقة ديناميكية + دعم preflight
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // للسماح بـ Postman مثلاً
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn("🚫 Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// ⚠️ السماح بطلبات preflight (OPTIONS)
app.options("*", cors());

// 🧩 Middleware أساسي
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan("dev"));

// ✅ تمرير pool إلى جميع الطلبات
app.use((req, res, next) => {
  req.pool = pool;
  next();
});

// =======================================
// 🕵️ تفعيل التسجيل التلقائي لجميع العمليات (Auto Audit)
// =======================================
app.use(autoAudit(pool));

// =======================================
// 🧱 استيراد المسارات (Routes)
// =======================================
import authRoutes from "./routes/auth.js";
import contractsRoutes from "./routes/contracts.js";
import propertiesRoutes from "./routes/properties.js";
import paymentsRoutes from "./routes/payments.js";
import receiptsRoutes from "./routes/receipts.js";
import expensesRoutes from "./routes/expenses.js";
import maintenanceRoutes from "./routes/maintenance.js";
import extractRouter from "./routes/extract.js";
import unitsRoutes from "./routes/units.js";
import adminRoutes from "./routes/admin.js";
import officesRoutes from "./routes/offices.js";
import userPermissionsRoutes from "./routes/permissions.js";
import remindersRouter from "./routes/reminders.js";
import Users from "./routes/users.js";
import reports from "./routes/reports.js";
import adminAnalyticsRoutes from "./routes/admin-analytics.js";

// =======================================
// 🔗 ربط المسارات
// =======================================
app.use("/auth", authRoutes);
app.use("/contracts", contractsRoutes);
app.use("/properties", propertiesRoutes);
app.use("/payments", paymentsRoutes);
app.use("/receipts", receiptsRoutes);
app.use("/expenses", expensesRoutes);
app.use("/maintenance", maintenanceRoutes);
app.use("/units", unitsRoutes);
app.use("/", extractRouter);
app.use("/admin", adminRoutes);
app.use("/offices", officesRoutes);
app.use("/admin", userPermissionsRoutes);
app.use("/reminders", remindersRouter);
app.use("/users", Users);
app.use("/reports", reports);
app.use("/admin/analytics", adminAnalyticsRoutes);
// =======================================
// ✅ فallback headers لـ CORS (احتياطي)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-api-key, x-active-role"
  );
  next();
});

// =======================================
// 🩺 اختبار الاتصال بقاعدة البيانات
// =======================================
app.get("/ping", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      success: true,
      message: "✅ Server is running",
      time: result.rows[0].now,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "❌ Database connection failed",
      error: err.message,
    });
  }
});

// =======================================
// 🧩 صفحة الجذر (اختبار التشغيل)
// =======================================
app.get("/", (req, res) => {
  res.send("🏡 Property Management API is running successfully 🚀");
});

// =======================================
// ⚠️ التعامل مع الأخطاء العامة
// =======================================
app.use((err, req, res, next) => {
  console.error("🔥 Global Error:", err);
  res.status(500).json({
    success: false,
    message: "حدث خطأ داخلي في الخادم",
    details: err.message,
  });
});

// =======================================
// 🚀 تشغيل الخادم
// =======================================
const PORT = process.env.PORT || 8085;
app.listen(PORT, async () => {
  try {
    const conn = await pool.connect();
    console.log("✅ Connected to PostgreSQL");
    conn.release();
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
  }
  console.log(`🚀 Server running on port ${PORT}`);
});

// =======================================
(async () => {
  try {
    await initWhatsAppClient();
    console.log("✅ WhatsApp client initialized from backend.");
  } catch (err) {
    console.error("❌ Failed to start WhatsApp client:", err.message);
  }
})();
