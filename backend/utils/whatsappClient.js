<<<<<<< HEAD
import fetch from "node-fetch";
=======
import wa from "@open-wa/wa-automate";
import fs from "fs";
import path from "path";
>>>>>>> 0b494e0

const WA_URL = process.env.WA_API_URL || "http://localhost:8002";
const WA_KEY = process.env.WA_API_KEY || "changeme123";

<<<<<<< HEAD
async function waitForWhatsAppReady(retries = 10, delay = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${WA_URL}/state`, {
        headers: { Authorization: WA_KEY },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.state === "CONNECTED") {
          console.log("✅ WhatsApp socket is ready");
          return true;
        }
      }
    } catch (e) {
      console.log(`⏳ Waiting for WhatsApp... (${i + 1}/${retries})`);
    }
    await new Promise((r) => setTimeout(r, delay));
  }
  console.error("❌ WhatsApp socket not ready after retries");
  return false;
=======
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

    // ======================================================
    // 🧭 Chrome path (يختار المسار الصحيح تلقائيًا)
    // ======================================================
    const isProd = process.env.NODE_ENV === "production";
    const executablePath = isProd
      ? process.env.PUPPETEER_EXECUTABLE_PATH ||
        "/usr/bin/chromium" ||
        "/usr/bin/google-chrome"
      : "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

    console.log("🧭 Using Chrome executable:", executablePath);

    // ======================================================
    // ⚙️ إعداد التكوين الديناميكي
    // ======================================================
    const config = {
      sessionId: "property-system-session",
      multiDevice: true,
      headless: isProd, // 🧠 تلقائي: local = false, render = true
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

    /* =========================================================
       🔄 تحديث الحالة عند التغيير
       ========================================================= */
    client.onStateChanged((state) => {
      console.log("🔄 WhatsApp state:", state);
      connectionState = state;

      if (state === "CONFLICT") client.forceRefocus();
      if (state === "CONNECTED") console.log("📶 WhatsApp connected successfully ✅");
      if (state === "UNPAIRED") console.log("📲 Please scan QR again.");
    });

    // ✅ اعتبر الجلسة متصلة عند أول رسالة واردة
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
>>>>>>> 0b494e0
}

export async function sendWhatsAppMessage(phone, message) {
  try {
<<<<<<< HEAD
    const ready = await waitForWhatsAppReady();
    if (!ready) throw new Error("WhatsApp socket not ready");

    const chatId = phone.replace(/^0/, "966") + "@c.us";
    const res = await fetch(`${WA_URL}/sendText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: WA_KEY,
      },
      body: JSON.stringify({ chatId, text: message }),
    });

    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    console.log("✅ WhatsApp message sent:", data);
    return data;
=======
    if (!client) await initWhatsAppClient();

    if (connectionState !== "CONNECTED") {
      console.log(`⚠️ WhatsApp not connected (state: ${connectionState})`);
      // لا تعيد التهيئة إذا العميل شغال فعلاً
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
>>>>>>> 0b494e0
  } catch (err) {
    console.error("❌ WhatsApp send error:", err.message);
    return { success: false, error: err.message };
  }
}
<<<<<<< HEAD
=======

/* =========================================================
   📊 الحصول على حالة الاتصال
   ========================================================= */
export function getConnectionState() {
  return connectionState;
}

export async function getWhatsAppClient() {
  if (!client) await initWhatsAppClient();
  return client;
}

/* =========================================================
   🧹 إغلاق جلسة واتساب بشكل آمن
   ========================================================= */
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
>>>>>>> 0b494e0
