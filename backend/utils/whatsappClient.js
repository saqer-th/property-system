import venom from "venom-bot";
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
   🚀 إنشاء عميل واتساب متكامل (Venom)
========================================================= */
export async function initWhatsAppClient() {
  if (client || isInitializing) return client;
  isInitializing = true;

  console.log("🚀 Initializing WhatsApp client (Venom)...");

  try {
    client = await venom.create({
      session: "property-system-session",
      multidevice: true,
      headless: true,
      folderNameToken: "session",
      disableSpins: true,
      logQR: true,
      mkdirFolderToken: sessionDir,
      browserArgs: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-extensions",
        "--disable-gpu",
        "--no-zygote",
      ],
    });

    /* =========================================================
       🔄 مراقبة تغييرات الحالة
    ========================================================= */
    client.onStateChange((state) => {
      console.log("🔄 WhatsApp state:", state);

      if (["CONNECTED", "SYNCING", "OPENING"].includes(state)) {
        connectionState = "CONNECTED";
      } else {
        connectionState = state;
      }
    });

    /* =========================================================
       📨 أول رسالة واردة = الجلسة مستقرة
    ========================================================= */
    client.onMessage(() => {
      if (connectionState !== "CONNECTED") {
        console.log("✅ WhatsApp is now active — session stable!");
        connectionState = "CONNECTED";
      }
    });

    console.log("💾 Venom WhatsApp session ready");
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
      await new Promise((r) => setTimeout(r, 3000));
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
      await client.close();
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
