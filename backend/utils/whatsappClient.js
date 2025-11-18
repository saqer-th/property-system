import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState
} from "@whiskeysockets/baileys";
import qrcodeTerminal from "qrcode-terminal";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/* ============================================
   🔧 بناء المسار الصحيح للجلسة
============================================ */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// الجلسة ستكون هنا:
// backend/session-baileys
const sessionDir = path.join(__dirname, "session-baileys");

if (!fs.existsSync(sessionDir)) {
  fs.mkdirSync(sessionDir, { recursive: true });
}

let sock = null;
let connectionState = "DISCONNECTED";
let isInitializing = false;

/* ============================================
   🚀 تشغيل Baileys
============================================ */
export async function initWhatsAppClient() {
  if (sock || isInitializing) return sock;
  isInitializing = true;

  console.log("🚀 Starting Baileys...");

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    browser: ["SaqrON", "Chrome", "1.0.0"],
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      console.log("✅ WhatsApp connected");
      connectionState = "CONNECTED";
    }

    if (connection === "close") {
      const reason =
        lastDisconnect?.error?.output?.statusCode ||
        lastDisconnect?.error?.output?.payload?.statusCode;

      console.log("⚠️ WhatsApp disconnected:", reason);

      if (reason === DisconnectReason.loggedOut) {
        console.log("❌ Logged out — removing session...");
        fs.rmSync(sessionDir, { recursive: true, force: true });
      } else {
        console.log("🔄 Reconnecting...");
        initWhatsAppClient();
      }
      connectionState = "DISCONNECTED";
    }
  });

  isInitializing = false;
  return sock;
}

/* ============================================
   💬 إرسال رسالة
============================================ */
function formatPhone(phone) {
  phone = phone.toString().replace(/\D/g, "");
  if (phone.startsWith("00")) phone = phone.slice(2);
  if (phone.startsWith("0")) phone = "966" + phone.slice(1);
  if (!phone.startsWith("966")) phone = "966" + phone;
  return `${phone}@s.whatsapp.net`;
}

export async function sendWhatsAppMessage(phone, message) {
  try {
    if (!sock) await initWhatsAppClient();

    const jid = formatPhone(phone);
    await sock.sendMessage(jid, { text: message });

    console.log(`📨 Message sent to ${jid}`);
    return { success: true };

  } catch (err) {
    console.error("❌ Baileys send error:", err.message);
    return { success: false };
  }
}

/* ============================================
   📊 حالة الاتصال
============================================ */
export function getConnectionState() {
  return connectionState;
}
