import wa from "@open-wa/wa-automate";
import fs from "fs";
import path from "path";

let client = null;
let isInitializing = false;
let connectionState = "DISCONNECTED";

/* =========================================================
   🚀 تهيئة عميل واتساب (يدعم Render / VPS / Local)
   ========================================================= */
export async function initWhatsAppClient() {
  if (client || isInitializing) return client;
  isInitializing = true;

  console.log("🚀 Initializing WhatsApp client...");

  try {
    const sessionDir = path.resolve("./.wadata");
    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

    const isProd = true; // ضع false للتجارب المحلية

    const executablePath = isProd
      ? "/usr/bin/chromium-browser"
      : "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

    console.log("🧭 Using Chrome executable:", executablePath);

    const config = {
      sessionId: "property-system-session",
      multiDevice: true,
      headless: true,
      useChrome: true,
      executablePath,
      dataPath: sessionDir,
      qrTimeout: 0,
      authTimeout: 0,
      cacheEnabled: true,
      disableSpins: true,
      killProcessOnBrowserClose: false,
      safeMode: false,
      qrLogSkip: false,
      qrMaxRetries: 10,


      qrCallback: async (qrData) => {
        try {
          const base64 = qrData.replace(/^data:image\/png;base64,/, "");
          const qrFile = path.join(sessionDir, "qr.png");
          fs.writeFileSync(qrFile, Buffer.from(base64, "base64"));
          console.log("📸 QR code saved to:", qrFile);
        } catch (err) {
          console.warn("⚠️ Failed to handle QR:", err.message);
        }
      },

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

    /* =========================================================
       🔄 مراقبة حالة الاتصال
       ========================================================= */
    client.onStateChanged(async (state) => {
      console.log("🔄 WhatsApp state:", state);
      connectionState = state;

      if (["CONFLICT", "UNLAUNCHED"].includes(state)) {
        console.log("⚠️ Conflict or unlaunched, refocusing...");
        client.forceRefocus();
      }

      if (["UNPAIRED", "DISCONNECTED"].includes(state)) {
        console.log("🧩 Client lost connection, reinitializing...");
        client = null;
        connectionState = "DISCONNECTED";
        await new Promise((r) => setTimeout(r, 5000));
        await initWhatsAppClient();
      }

      if (state === "CONNECTED") {
        console.log("✅ WhatsApp connected successfully");
      }
    });

    client.onAnyMessage(() => {
      if (connectionState !== "CONNECTED") {
        console.log("✅ WhatsApp is now active — session stable!");
        connectionState = "CONNECTED";
      }
    });

    console.log("💾 WhatsApp session ready!");
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
   💬 إرسال رسالة واتساب مع معالجة Detached Frame
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

    // ⏳ انتظار الاتصال الكامل
    let attempts = 0;
    while (connectionState !== "CONNECTED" && attempts < 10) {
      console.log(`⏳ Waiting for WhatsApp to connect... (${attempts + 1})`);
      await new Promise((r) => setTimeout(r, 2000));
      attempts++;
    }

    if (connectionState !== "CONNECTED") {
      throw new Error("WhatsApp not connected yet");
    }

    const target = phone.includes("@c.us") ? phone : formatPhone(phone);
    await client.sendText(target, message);
    console.log(`✅ WhatsApp message sent to ${target}`);
    return { success: true, target };

  } catch (err) {
    console.error("❌ WhatsApp send error:", err.message);

    // ♻️ إصلاح detached frame أو disconnect
    if (
      err.message.includes("detached Frame") ||
      err.message.includes("Target closed") ||
      err.message.includes("not connected")
    ) {
      console.log("♻️ Reinitializing WhatsApp client after error...");
      client = null;
      connectionState = "DISCONNECTED";
      await new Promise((r) => setTimeout(r, 3000));
      await initWhatsAppClient();
    }

    return { success: false, error: err.message };
  }
}

/* =========================================================
   📊 حالة الاتصال
   ========================================================= */
export function getConnectionState() {
  return connectionState;
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
      console.error("⚠️ Error closing WhatsApp:", err.message);
    }
  }
  client = null;
  connectionState = "DISCONNECTED";
  isInitializing = false;
}

/* =========================================================
   🧩 إغلاق التطبيق عند الخروج
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
