import wa from "@open-wa/wa-automate";
import fs from "fs";
import path from "path";

let client = null;
let isInitializing = false;
let connectionState = "DISCONNECTED";

/* =========================================================
   🚀 إنشاء عميل واتساب متكامل (يدعم Local + Render تلقائيًا)
   ========================================================= */
export async function initWhatsAppClient() {
  if (client) return client;
  if (isInitializing) return client;
  isInitializing = true;

  console.log("🚀 Initializing WhatsApp client...");

  try {
    const sessionDir = path.resolve("./.wadata");
    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

    const sessionPath = path.join(sessionDir, "_IGNORE_property-system-session");

    // 🧹 إزالة ملفات القفل القديمة (في حال التعطل)
    const lockFiles = [
      "SingletonLock",
      "SingletonCookie",
      "CrashpadMetrics-active.pma",
    ];
    for (const f of lockFiles) {
      const filePath = path.join(sessionPath, f);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`🧹 Removed lock file: ${f}`);
        } catch (err) {
          console.warn(`⚠️ Could not remove ${f}: ${err.message}`);
        }
      }
    }

    const hasSession = fs.existsSync(path.join(sessionDir, "Default"));

    const isProd = process.env.NODE_ENV === "production";
    const executablePath = isProd
      ? process.env.PUPPETEER_EXECUTABLE_PATH ||
        "/usr/bin/chromium" ||
        "/usr/bin/google-chrome"
      : "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

    console.log("🧭 Using Chrome executable:", executablePath);

    const config = {
      sessionId: "property-system-session",
      multiDevice: true,
      headless: isProd,
      useChrome: true,
      executablePath,
      dataPath: sessionDir,
      sessionDataPath: sessionDir,
      qrTimeout: 0,
      authTimeout: 0,
      cacheEnabled: true,
      disableSpins: true,
      killProcessOnBrowserClose: false,
      safeMode: true,
      chromiumArgs: isProd
        ? [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--no-zygote",
            "--disable-software-rasterizer",
          ]
        : [],

      restartOnCrash: async () => {
        console.log("🔄 Restarting WhatsApp after crash...");
        client = null;
        connectionState = "DISCONNECTED";
        isInitializing = false;
        await new Promise((r) => setTimeout(r, 3000));
        return initWhatsAppClient();
      },
    };

    client = await wa.create(config);

    client.onStateChanged((state) => {
      console.log("🔄 WhatsApp state:", state);
      connectionState = state;
      if (state === "CONFLICT") client.forceRefocus();
      if (state === "CONNECTED") console.log("📶 WhatsApp connected successfully ✅");
      if (state === "UNPAIRED") console.log("📲 Please scan QR again.");
    });

    client.onAnyMessage(() => {
      if (connectionState !== "CONNECTED") {
        console.log("✅ WhatsApp is now active — session stable!");
        connectionState = "CONNECTED";
      }
    });

    connectionState = hasSession ? "CONNECTED" : "UNPAIRED";
    console.log(
      hasSession
        ? "💾 Session restored — no QR required 🎉"
        : "📲 New session created — scan the QR code once."
    );

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
      if (client) {
        console.log("⏳ Waiting for WhatsApp to finish pairing...");
        await new Promise((r) => setTimeout(r, 5000));
      } else {
        console.log("🔁 Client was null, initializing...");
        await initWhatsAppClient();
      }
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
   📊 الحالة + الإغلاق الآمن
   ========================================================= */
export function getConnectionState() {
  return connectionState;
}

export async function closeWhatsApp() {
  if (client) {
    try {
      await client.kill();
      console.log("🧹 WhatsApp session closed");
    } catch (err) {
      console.error("⚠️ Error closing WhatsApp:", err.message);
    }
    client = null;
    connectionState = "DISCONNECTED";
    isInitializing = false;
  }
}

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
