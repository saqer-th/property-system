// backend/install-chromium.js
import puppeteer from "puppeteer";

(async () => {
  try {
    console.log("⬇️ Downloading Chromium for Puppeteer...");
    const browserFetcher = puppeteer.createBrowserFetcher();
    const revisionInfo = await browserFetcher.download("1139721"); // stable revision
    console.log("✅ Chromium downloaded to:", revisionInfo.executablePath);
  } catch (err) {
    console.error("❌ Failed to download Chromium:", err.message);
  }
})();
