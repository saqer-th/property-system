import wa from "@open-wa/wa-automate";
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";

let client = null;
let isInitializing = false;
let connectionState = "DISCONNECTED";

/* =========================================================
   🧩 إنشاء عميل واتساب (جاهز لـ Render)
   ========================================================= */
export async function initWhatsAppClient() {
  if (client) {
    console.log("⚡ WhatsApp client already initialized");
    return client;
  }

  if (isInitializing) {
    console.log("⏳ WhatsApp client is already initializing...");
    while (isInitializing) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    return client;
  }

  isInitializing = true;
  console.log("🚀 Initializing WhatsApp client...");

  try {
    const sessionDir = path.resolve("./.wadata");
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    const hasSession = fs.existsSync(path.join(sessionDir, "Default"));

    const isProduction = process.env.NODE_ENV === "production";

    // pick browser binary
    let executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    if (!isProduction) {
      try {
        executablePath = puppeteer.executablePath();
      } catch {
        // fall back to system Chrome if available
        executablePath = undefined;
      }
    }
    console.log("🧭 Using browser executable:", executablePath || "(puppeteer default)");

    const config = {
      sessionId: "property-system-session",
      multiDevice: true,
      headless: true, // stable with Render
      useChrome: false, // control via executablePath
      executablePath,   // on Render: /usr/bin/chromium (set via env)
      dataPath: sessionDir,
      sessionDataPath: sessionDir,

      authTimeout: 0,
      qrTimeout: 0,
      restartOnCrash: async () => {
        console.log("🔄 WhatsApp crashed, restarting...");
        client = null;
        connectionState = "DISCONNECTED";
        isInitializing = false;
        await new Promise((r) => setTimeout(r, 3000));
        return initWhatsAppClient();
      },
      killProcessOnBrowserClose: true,
      cacheEnabled: true,
      disableSpins: true,
      skipBrokenMethodsCheck: true,
    };

    if (isProduction) {
      config.chromiumArgs = [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--no-zygote",
        // no "--single-process"
      ];
    }

    client = await wa.create(config);

    console.log("✅ WhatsApp client ready");

    // 🔄 معالجة حالات الاتصال
    client.onStateChanged((state) => {
      console.log("🔄 WhatsApp state:", state);
      connectionState = state;

      if (state === "CONFLICT") {
        console.log("⚠️ WhatsApp session conflict detected");
        client.forceRefocus();
      }

      if (state === "UNLAUNCHED") {
        console.log("⚠️ WhatsApp unlaunched");
      }

      if (state === "UNPAIRED") {
        console.log("⚠️ WhatsApp unpaired - QR scan required");
      }

      if (state === "CONNECTED") {
        console.log("📶 WhatsApp connected successfully ✅");
      }
    });

    // ✅ حدد الحالة الافتراضية
    connectionState = hasSession ? "CONNECTED" : "UNPAIRED";

    isInitializing = false;

    console.log(
      hasSession
        ? "💾 Session restored successfully — no QR required 🎉"
        : "📲 New session created — scan the QR code once."
    );

    return client;
  } catch (err) {
    console.error("❌ WhatsApp init error:", err.message || err);
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
    // ✅ محاولة إعادة الاتصال إذا كان العميل مفصولاً
    if (!client) {
      console.log("🔄 Client not initialized, initializing...");
      await initWhatsAppClient();
    }

    // ✅ التحقق من حالة الاتصال باستخدام المتغير المحلي
    if (connectionState !== "CONNECTED") {
      console.log(`⚠️ WhatsApp not connected (state: ${connectionState}), retrying...`);
      client = null;
      isInitializing = false;
      await initWhatsAppClient();
    }

    const target = phone.includes("@c.us") ? phone : formatPhone(phone);

    // ✅ التحقق من صلاحية الرقم (اختياري - قد يسبب بطء)
    try {
      const isValid = await client.checkNumberStatus(target);
      if (!isValid || !isValid.numberExists) {
        console.warn(`⚠️ Phone number ${target} might not be registered on WhatsApp`);
        // لا نرمي خطأ، نحاول الإرسال على أي حال
      }
    } catch (checkErr) {
      console.warn("⚠️ Could not verify number, proceeding anyway:", checkErr.message);
    }

    await client.sendText(target, message);
    console.log(`✅ WhatsApp message sent to ${target}`);
    return { success: true, target };
  } catch (err) {
    console.error("❌ WhatsApp send error:", err.message || err);

    // ✅ إعادة المحاولة مرة واحدة
    if (
      err.message.includes("Session closed") ||
      err.message.includes("Protocol error") ||
      err.message.includes("Target closed") ||
      err.message.includes("not a function") ||
      err.message.includes("Failed to launch")
    ) {
      console.log("🔄 Retrying after session error...");
      client = null;
      connectionState = "DISCONNECTED";
      isInitializing = false;

      try {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await initWhatsAppClient();
        const target = phone.includes("@c.us") ? phone : formatPhone(phone);
        await client.sendText(target, message);
        console.log(`✅ WhatsApp message sent to ${target} (retry successful)`);
        return { success: true, target };
      } catch (retryErr) {
        console.error("❌ Retry failed:", retryErr.message);
        return { success: false, error: retryErr.message };
      }
    }

    return { success: false, error: err.message };
  }
}

/* =========================================================
   📊 الحصول على حالة الاتصال
   ========================================================= */
export function getConnectionState() {
  return connectionState;
}

export async function getWhatsAppClient() {
  if (!client) {
    await initWhatsAppClient();
  }
  return client;
}

export async function closeWhatsApp() {
  if (client) {
    try {
      await client.kill();
      client = null;
      connectionState = "DISCONNECTED";
      isInitializing = false;
      console.log("🧹 WhatsApp session closed");
    } catch (err) {
      console.error("⚠️ Error closing WhatsApp:", err.message);
      client = null;
      connectionState = "DISCONNECTED";
      isInitializing = false;
    }
  }
}

// ✅ معالجة إغلاق التطبيق
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
