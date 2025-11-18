import wa from "@open-wa/wa-automate";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/* =========================================================
   📌 إعداد المسارات
========================================================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendDir = path.resolve(__dirname, "..");
const sessionDir = path.join(backendDir, "session");

// حذف ملف جلسة قديم
const legacyFile = path.join(backendDir, "property-system-session.data.json");
if (fs.existsSync(legacyFile)) {
  fs.unlinkSync(legacyFile);
  console.log("🧹 Removed legacy session file:", legacyFile);
}

// إنشاء مجلد الجلسة إذا لم يكن موجود
if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

let client = null;
let isInitializing = false;
let connectionState = "DISCONNECTED";

/* =========================================================
   🚀 تشغيل Open-WA في Legacy Mode (Non-MD)
========================================================= */
export async function initWhatsAppClient() {
  if (client || isInitializing) return client;
  isInitializing = true;

  console.log("🚀 Initializing WhatsApp (LEGACY MODE)...");

  try {
    const executablePaths = [
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/usr/bin/google-chrome-stable"
    ];

    let executablePath = executablePaths.find((p) => fs.existsSync(p));
    if (!executablePath) {
      executablePath = "/usr/bin/chromium-browser"; // fallback
    }

    console.log("🧭 Browser:", executablePath);
    console.log("💾 Session Directory:", sessionDir);

    const config = {
      sessionId: "property-system-session",

      /* 👑 أهم شيء هنا */
      multiDevice: false,              // 🔥 يعطّل MD Mode تماماً
      legacy: true,                    // 🔥 يشغّل WhatsApp Web القديم
      skipBrokenMethodsCheck: true,    // 🔥 يوقف فحص دوال WAPI

      headless: true,                  // يخلي المتصفح مخفي
      useChrome: true,
      executablePath,
      dataPath: sessionDir,
      userDataDir: sessionDir,
      qrTimeout: 0,
      authTimeout: 0,
      safeMode: false,
      disableSpins: true,
      killProcessOnBrowserClose: false,

      chromiumArgs: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-extensions",
        "--disable-gpu",
        "--no-zygote",
        `--user-data-dir=${sessionDir}`,
        "--user-agent='Mozilla/5.0 (Linux; Android 10; SM-G975F)'"
      ],
    };

    client = await wa.create(config);

    // مراقبة الحالة
    client.onStateChanged((state) => {
      console.log("🔄 WhatsApp state:", state);

      if (state === "CONNECTED") connectionState = "CONNECTED";
      else connectionState = state;
    });

    // تثبيت الجلسة
    client.onAnyMessage(() => {
      if (connectionState !== "CONNECTED") {
        console.log("📶 Session stable!");
        connectionState = "CONNECTED";
      }
    });

    console.log("✅ LEGACY MODE READY");
    isInitializing = false;
    return client;

  } catch (err) {
    console.error("❌ WhatsApp init error:", err.message);
    client = null;
    connectionState = "DISCONNECTED";
    isInitializing = false;
    throw err;
  }
}

/* =========================================================
   💬 إرسال الرسائل — يدعم فتح محادثات جديدة
========================================================= */
function formatPhone(phone) {
  if (!phone) return null;

  phone = phone.toString().replace(/\D/g, "");

  if (phone.startsWith("00")) phone = phone.slice(2);
  if (phone.startsWith("0")) phone = "966" + phone.slice(1);
  if (!phone.startsWith("966")) phone = "966" + phone;

  return `${phone}@c.us`;
}

export async function sendWhatsAppMessage(phone, message) {
  try {
    if (!client) await initWhatsAppClient();

    if (connectionState !== "CONNECTED") {
      console.log("⏳ Waiting for WhatsApp connection...");
      await new Promise((r) => setTimeout(r, 3000));
    }

    const target = phone.includes("@c.us") ? phone : formatPhone(phone);

    await client.sendText(target, message);
    console.log(`📩 Message sent to: ${target}`);

    return { success: true };

  } catch (err) {
    console.error("❌ Send error:", err.message);
    return { success: false, error: err.message };
  }
}

/* =========================================================
   🧹 إغلاق الجلسة
========================================================= */
export async function closeWhatsApp() {
  if (client) {
    try {
      await client.kill();
      console.log("🧹 WhatsApp session closed");
    } catch (err) {
      console.error("⚠️ Error closing:", err.message);
    }
  }

  client = null;
  connectionState = "DISCONNECTED";
  isInitializing = false;
}
