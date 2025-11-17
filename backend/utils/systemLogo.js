import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logoPath = path.join(__dirname, "../assets/system-logo.png");

let systemLogo = "";

try {
  const ext = path.extname(logoPath).substring(1);
  const base64 = fs.readFileSync(logoPath, { encoding: "base64" });
  systemLogo = `data:image/${ext};base64,${base64}`;
  console.log("SYSTEM LOGO LOADED OK");
} catch (err) {
  console.error("❌ Failed to load logo:", err);
}

export { systemLogo };
