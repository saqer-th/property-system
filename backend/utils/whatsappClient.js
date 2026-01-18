import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import qrcode from "qrcode-terminal";
import pkg from "whatsapp-web.js";   // <-- الحل

const { Client, LocalAuth } = pkg;  // <-- استخراج الكلاسات

/* =========================================================
   📂 إعداد المسارات
========================================================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendDir = path.resolve(__dirname, "..");
const sessionDir = path.join(backendDir, "session");

if (!fs.existsSync(sessionDir)) {
  fs.mkdirSync(sessionDir, { recursive: true });
}

let client = null;
let isInitializing = false;
let connectionState = "DISCONNECTED";

/* =========================================================
   🚀 تشغيل WhatsApp-Web.js (NO-STORE MODE)
========================================================= */
export async function initWhatsAppClient() {
  if (client || isInitializing) return client;
  isInitializing = true;

  console.log("🚀 Initializing WhatsApp-Web.js (NO-STORE MODE)...");

  try {
    const browserPaths = [
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium"
    ];

    let executablePath = browserPaths.find((p) => fs.existsSync(p)) || undefined;

    client = new Client({
      authStrategy: new LocalAuth({
        clientId: "property-system-session",
        dataPath: sessionDir
      }),

      puppeteer: {
        headless: false,
        executablePath,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-extensions",
          "--disable-gpu",
          "--no-zygote"
        ]
      },

      takeoverOnConflict: false,
      takeoverTimeoutMs: 0,

      webVersionCache: {
        type: "remote",
        remotePath:
          "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1014215569.html"
      }
    });

    /* ===== QR ===== */
    client.on("qr", (qr) => {
      console.log("\n📌 امسح هذا الـ QR:");
      qrcode.generate(qr, { small: true });
    });

    client.on("ready", () => {
      console.log("✅ WhatsApp Ready");
      connectionState = "CONNECTED";
    });

    client.on("authenticated", () => console.log("🔑 Authenticated"));
    client.on("auth_failure", (m) => console.log("❌ Auth failed:", m));
    client.on("disconnected", (reason) => {
      console.log("⚠️ Disconnected:", reason);
      connectionState = "DISCONNECTED";
    });

    await client.initialize();

    isInitializing = false;
    return client;

  } catch (err) {
    console.error("❌ init error:", err.message);
    client = null;
    isInitializing = false;
    connectionState = "DISCONNECTED";
    throw err;
  }
}

/* =========================================================
   💬 إرسال رسالة
========================================================= */
function formatPhone(phone) {
  phone = phone.toString().replace(/\D/g, "");
  if (phone.startsWith("0")) phone = "966" + phone.slice(1);
  if (!phone.startsWith("966")) phone = "966" + phone;
  return `${phone}@c.us`;
}

export async function sendWhatsAppMessage(phone, message) {
  try {
    if (!client) await initWhatsAppClient();

    const target = formatPhone(phone);

    await client.sendMessage(target, message, { sendSeen: false });
    console.log(`📩 Message sent to: ${target}`);

    return { success: true };
  } catch (err) {
    console.error("❌ Send error:", err.message);
    return { success: false, error: err.message };
  }
}
