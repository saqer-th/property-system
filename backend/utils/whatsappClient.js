import wa from "@open-wa/wa-automate";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/* =========================================================
   🧭 إعداد المسارات
   ========================================================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 📁 المسار الثابت لمجلد الجلسة داخل backend
const backendDir = path.resolve(__dirname, "..");
const sessionDir = path.join(backendDir, "session");

// 🧹 إزالة أي ملفات جلسة قديمة تسبب تعارض
const legacyFile = path.join(backendDir, "property-system-session.data.json");
if (fs.existsSync(legacyFile)) {
  fs.unlinkSync(legacyFile);
  console.log("🧹 Removed legacy session file:", legacyFile);
}

// تأكد من وجود المجلد
if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

let client = null;
let isInitializing = false;
let connectionState = "DISCONNECTED";

/* =========================================================
   🚀 إنشاء عميل واتساب متكامل (جلسة ثابتة)
   ========================================================= */
export async function initWhatsAppClient() {
  if (client || isInitializing) return client;
  isInitializing = true;

  console.log("🚀 Initializing WhatsApp client...");

  try {
    const isProd = true;
    const executablePath = isProd
      ? "/usr/bin/chromium-browser"
      : "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

    console.log("🧭 Using Chrome executable:", executablePath);
    console.log("💾 WhatsApp session directory:", sessionDir);

    // 🔍 تحقق إن كانت جلسة قديمة محفوظة
    const hasExistingSession =
      fs.existsSync(path.join(sessionDir, "Default")) &&
      fs.existsSync(path.join(sessionDir, "Local State"));

    if (hasExistingSession)
      console.log("💾 Found existing WhatsApp session. Restoring...");
    else console.log("📲 New session detected. Scan QR when prompted.");

    const config = {
      sessionId: "property-system-session",
      multiDevice: true,
      headless: isProd,
      useChrome: true,
      executablePath,
      dataPath: sessionDir,
      userDataDir: sessionDir,
      qrTimeout: 0,
      authTimeout: 0,
      cacheEnabled: true,
      disableSpins: true,
      killProcessOnBrowserClose: true,
      safeMode: false,
      qrLogSkip: false,
      qrMaxRetries: 10,
      chromiumArgs: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-extensions",
        "--disable-gpu",
        "--no-zygote",
        `--user-data-dir=${sessionDir}`,
      ],
    };

    client = await wa.create(config);

    /* =========================================================
       🔄 مراقبة تغييرات الحالة
       ========================================================= */
    client.onStateChanged((state) => {
      console.log("🔄 WhatsApp state:", state);
      connectionState = state;

      if (state === "CONFLICT") client.forceRefocus();
      if (state === "CONNECTED" || state === "SYNCING") {
        console.log("📶 WhatsApp connected successfully ✅");
        connectionState = "CONNECTED";
      }
      if (state === "UNPAIRED") console.log("📲 Please scan QR again.");
    });

    /* =========================================================
       📨 عند أول رسالة واردة نعتبر الجلسة مستقرة
       ========================================================= */
    client.onAnyMessage(() => {
      if (connectionState !== "CONNECTED") {
        console.log("✅ WhatsApp is now active — session stable!");
        connectionState = "CONNECTED";
      }
    });

    console.log("💾 WhatsApp session ready and saved in:", sessionDir);

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
   💬 إرسال رسالة واتساب
   ========================================================= */
function formatPhone(phone) {
  if (!phone) return null;
  let p = phone.toString().replace(/\D/g, "");
  if (p.startsWith("00")) p = p.slice(2);
  if (p.startsWith("0")) p = "966" + p.slice(1);
  if (!p.startsWith("966")) p = "966" + p;
  return `${p}@c.us`;
}

export async function sendWhatsAppMessage(phone, message) {
  try {
    if (!client) await initWhatsAppClient();
    if (connectionState !== "CONNECTED") {
      console.log(`⚠️ WhatsApp not connected (state: ${connectionState})`);
      await new Promise((r) => setTimeout(r, 4000));
    }

    const target = phone.includes("@c.us") ? phone : formatPhone(phone);
    await client.sendText(target, message);
    console.log(`✅ WhatsApp message sent to ${target}`);
    return { success: true, target };
  } catch (err) {
    console.error("❌ WhatsApp send error:", err.message);
    return { success: false, error: err.message };
  }
}

/* =========================================================
   📊 حالة الاتصال
   ========================================================= */
export function getConnectionState() {
  return connectionState;
}

export async function getWhatsAppClient() {
  if (!client) await initWhatsAppClient();
  return client;
}

/* =========================================================
   🧹 إغلاق الجلسة بشكل آمن
   ========================================================= */
export async function closeWhatsApp() {
  if (client) {
    try {
      await client.kill();
      console.log("🧹 WhatsApp session closed");
    } catch (err) {
      console.error("⚠️ Error closing WhatsApp:", err.message);
    }
  }
  client = null;
  connectionState = "DISCONNECTED";
  isInitializing = false;
}

/* =========================================================
   🧩 إغلاق التطبيق بالكامل عند الخروج
   ========================================================= */
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  await closeWhatsApp();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Received SIGTERM...");
  await closeWhatsApp();
  process.exit(0);
});
