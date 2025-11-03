import fetch from "node-fetch";

const WA_URL = process.env.WA_API_URL || "http://localhost:8002";
const WA_KEY = process.env.WA_API_KEY || "changeme123";

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
}

export async function sendWhatsAppMessage(phone, message) {
  try {
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
  } catch (err) {
    console.error("❌ WhatsApp send error:", err.message);
    return { success: false, error: err.message };
  }
}
