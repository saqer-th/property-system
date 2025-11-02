import wa from "@open-wa/wa-automate";
import fs from "fs";
import path from "path";

// ⛔ إصلاح خطأ Puppeteer 22+ (يمنع التحميل اليدوي)
process.env.PUPPETEER_SKIP_DOWNLOAD = "true";

let client = null;

/* =========================================================
   🧩 إنشاء عميل واتساب (نسخة مستقرة لـ Render ومحلي)
   ========================================================= */
export async function initWhatsAppClient() {
  if (client) {
    console.log("⚡ WhatsApp client already initialized");
    return client;
  }

  console.log("🚀 Initializing WhatsApp client...");

  try {
    // ✅ تأكد من وجود مجلد الجلسة
    const sessionDir = path.resolve("./.wadata");
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
      console.log("📁 Created session directory:", sessionDir);
    }

    // ✅ تحقق مما إذا كانت هناك جلسة محفوظة مسبقًا
    const hasSession = fs.existsSync(path.join(sessionDir, "Default"));
    if (hasSession) {
      console.log("💾 Restoring existing WhatsApp session...");
    }

    // ✅ إعداد العميل
    client = await wa.create({
      sessionId: "property-system-session",
      multiDevice: true,
      headless: true,

      // ⚙️ استخدم Chrome لو متاح، أو Chromium من Puppeteer
      useChrome: true,
      executablePath:
        process.env.CHROME_PATH ||
        "/usr/bin/chromium-browser" ||
        "/usr/bin/google-chrome-stable",

      authTimeout: 0,
      qrTimeout: 0,
      dataPath: sessionDir,
      sessionDataPath: sessionDir,

      restartOnCrash: initWhatsAppClient,
      killProcessOnBrowserClose: false,
      cacheEnabled: true,

      // ⚙️ إعدادات Chromium الآمنة على Render
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

    // 🔄 متابعة الحالة
    client.onStateChanged((state) => {
      console.log("🔄 WhatsApp state:", state);
      if (["CONFLICT", "UNLAUNCHED", "UNPAIRED"].includes(state)) {
        client.forceRefocus();
      }
      if (state === "CONNECTED") {
        console.log("📶 WhatsApp connected successfully ✅");
      }
    });

    // ✅ تأكيد استرجاع الجلسة
    if (hasSession) {
      console.log("💾 Session restored successfully — no QR required 🎉");
    } else {
      console.log("📲 New session created — scan the QR code once.");
    }

    return client;
  } catch (err) {
    console.error("❌ WhatsApp init error:", err.message || err);
    client = null;
    throw err;
  }
}

/* =========================================================
   🧮 تنسيق رقم الجوال قبل الإرسال
   ========================================================= */
function formatPhone(phone) {
  if (!phone) return null;
  let p = phone.toString().replace(/\D/g, "");
  if (p.startsWith("00")) p = p.slice(2);
  if (p.startsWith("0")) p = "966" + p.slice(1);
  if (!p.startsWith("966")) p = "966" + p;
  return `${p}@c.us`;
}

/* =========================================================
   💬 إرسال رسالة واتساب
   ========================================================= */
export async function sendWhatsAppMessage(phone, message) {
  try {
    const c = await initWhatsAppClient();
    if (!c) throw new Error("WhatsApp client not initialized");

    const target = phone.includes("@c.us") ? phone : formatPhone(phone);
    if (!target) throw new Error("رقم الجوال غير صالح");

    await c.sendText(target, message);
    console.log(`✅ WhatsApp message sent to ${target}`);

    return { success: true, target };
  } catch (err) {
    console.error("❌ WhatsApp send error:", err.message || err);
    return { success: false, error: err.message };
  }
}

/* =========================================================
   🧹 إغلاق جلسة واتساب
   ========================================================= */
export async function closeWhatsApp() {
  if (client) {
    try {
      await client.close();
      client = null;
      console.log("🧹 WhatsApp session closed");
    } catch (err) {
      console.error("❌ WhatsApp close error:", err.message || err);
    }
  }
}
