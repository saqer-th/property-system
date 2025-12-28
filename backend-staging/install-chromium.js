// backend/install-chromium.js
import { execSync } from "child_process";
import fs from "fs";

const isProduction = process.env.NODE_ENV === "production";

if (!isProduction) {
  try {
    const puppeteer = await import("puppeteer");
    const p = puppeteer.default?.executablePath?.() || puppeteer.executablePath();
    console.log("✅ Dev Chromium ready at:", p);
  } catch (err) {
    console.warn("⚠️ Dev Chromium not set:", err.message);
  }
} else {
  console.log("🔧 Installing browser for Render (production)...");
  try {
    execSync("which apt-get", { stdio: "ignore" });
  } catch {
    console.log("⚠️ apt-get not found, skipping browser install");
    process.exit(0);
  }

  try {
    execSync("apt-get update -qq", { stdio: "inherit" });
    // Prefer Chromium on Render images
    execSync("apt-get install -y -qq chromium || apt-get install -y -qq chromium-browser", { stdio: "inherit" });
  } catch (e) {
    console.warn("⚠️ Chromium install failed:", e.message);
  }

  const candidates = [
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome-stable",
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  console.log(found ? `✅ Browser installed at: ${found}` : "⚠️ No browser found");
}
