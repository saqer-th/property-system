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
  if (client || isInitializing) return client;
  isInitializing = true;

  console.log("🚀 Initializing WhatsApp client...");

  try {
    const sessionDir = path.resolve("./.wadata");
    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

    const sessionPath = path.join(sessionDir, "_IGNORE_property-system-session");

    // 🧹 تنظيف ملفات القفل القديمة
    for (const file of ["SingletonLock", "SingletonCookie", "CrashpadMetrics-active.pma"]) {
      const filePath = path.join(sessionPath, file);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`🧹 Removed lock file: ${file}`);
        } catch (err) {
          console.warn(`⚠️ Could not remove ${file}: ${err.message}`);
        }
      }
    }

    const hasSession = fs.existsSync(path.join(sessionDir, "Default"));
    const isProd = false; //process.env.NODE_ENV === "production";

    // 🧭 اختيار المسار الصحيح لـ Chrome
    const executablePath = isProd
      ? "/usr/bin/chromium-browser"
      : "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

    console.log("🧭 Using Chrome executable:", executablePath);

    const config = {
      sessionId: "property-system-session",
      multiDevice: true,
      headless: isProd,
      useChrome: true,
      executablePath,
      dataPath: sessionDir,
      qrTimeout: 0,
      authTimeout: 0,
      cacheEnabled: true,
      disableSpins: true,
      killProcessOnBrowserClose: false,
      safeMode: false, // ✅ خليها false في Render
      qrLogSkip: false,
      qrMaxRetries: 10,

      // ✅ لا نستخدم chromiumArgs لأنها تسبب تعطل على multi-device
      // chromiumArgs: isProd ? [...] : [],

      // ✅ عرض QR مشفر في اللوج + حفظه كصورة
      qrCallback: async (qrData) => {
        try {
          const base64 = qrData.replace(/^data:image\/png;base64,/, "");
          const qrFile = path.join(sessionDir, "qr.png");
          fs.writeFileSync(qrFile, Buffer.from(base64, "base64"));

          console.log("📱 Copy all lines below and decode at → https://base64.guru/converter/decode/image");
          for (let i = 0; i < base64.length; i += 4000) {
            console.log(base64.substring(i, i + 4000));
          }
          console.log(`📸 QR also saved to: ${qrFile}`);
        } catch (err) {
          console.warn("⚠️ Failed to handle QR:", err.message);
        }
      },

      // ✅ إعادة التشغيل التلقائي عند التعطل
      restartOnCrash: async () => {
        console.log("🔄 Restarting WhatsApp after crash...");
        client = null;
        connectionState = "DISCONNECTED";
        isInitializing = false;
        await new Promise((r) => setTimeout(r, 5000));
        return initWhatsAppClient();
      },
    };

    client = await wa.create(config);

    // 🔄 تحديث الحالة عند التغيير
    client.onStateChanged((state) => {
      console.log("🔄 WhatsApp state:", state);
      connectionState = state;
      if (state === "CONFLICT") client.forceRefocus();
      if (state === "CONNECTED") console.log("📶 WhatsApp connected successfully ✅");
      if (state === "UNPAIRED") console.log("📲 Please scan QR again.");
    });

    // ✅ عند أول رسالة واردة، نعتبر الجلسة مستقرة
    client.onAnyMessage(() => {
      if (connectionState !== "CONNECTED") {
        console.log("✅ WhatsApp is now active — session stable!");
        connectionState = "CONNECTED";
      }
    });

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
