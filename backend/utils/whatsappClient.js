import wa from "@open-wa/wa-automate";
import fs from "fs";
import path from "path";

// 🧱 منع Puppeteer من محاولة تنزيل Chromium
process.env.PUPPETEER_SKIP_DOWNLOAD = "true";

let client = null;

/* =========================================================
   🧩 إنشاء عميل واتساب (جاهز لـ Render أو محلي)
   ========================================================= */
export async function initWhatsAppClient() {
  if (client) {
    console.log("⚡ WhatsApp client already initialized");
    return client;
  }

  console.log("🚀 Initializing WhatsApp client...");

  try {
    const sessionDir = path.resolve("./.wadata");
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
      console.log("📁 Created session directory:", sessionDir);
    }

    const hasSession = fs.existsSync(path.join(sessionDir, "Default"));
    if (hasSession) console.log("💾 Restoring existing WhatsApp session...");

    client = await wa.create({
      sessionId: "property-system-session",
      multiDevice: true,
      headless: true,

      // 🟢 استخدم Chromium الداخلي فقط (لا تحاول تحميل أو مسار خارجي)
      useChrome: false,

      // 🧠 بيانات الجلسة
      dataPath: sessionDir,
      sessionDataPath: sessionDir,

      authTimeout: 0,
      qrTimeout: 0,
      restartOnCrash: initWhatsAppClient,
      killProcessOnBrowserClose: false,
      cacheEnabled: true,

      chromiumArgs: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-extensions",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-dev-shm-usage",
      ],
    });

    console.log("✅ WhatsApp client ready");

    client.onStateChanged((state) => {
      console.log("🔄 WhatsApp state:", state);
      if (["CONFLICT", "UNLAUNCHED", "UNPAIRED"].includes(state)) {
        client.forceRefocus();
      }
      if (state === "CONNECTED") {
        console.log("📶 WhatsApp connected successfully ✅");
      }
    });

    console.log(
      hasSession
        ? "💾 Session restored successfully — no QR required 🎉"
        : "📲 New session created — scan the QR code once."
    );

    return client;
  } catch (err) {
    console.error("❌ WhatsApp init error:", err.message || err);
    client = null;
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
    const c = await initWhatsAppClient();
    const target = phone.includes("@c.us") ? phone : formatPhone(phone);
    await c.sendText(target, message);
    console.log(`✅ WhatsApp message sent to ${target}`);
    return { success: true, target };
  } catch (err) {
    console.error("❌ WhatsApp send error:", err.message || err);
    return { success: false, error: err.message };
  }
}

export async function closeWhatsApp() {
  if (client) {
    await client.close();
    client = null;
    console.log("🧹 WhatsApp session closed");
  }
}
