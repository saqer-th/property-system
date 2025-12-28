import fs from "fs";
import path from "path";
import handlebars from "handlebars";
import puppeteer from "puppeteer";
import sanitizeHtml from "sanitize-html";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =========================================================
   🖨️ Generate PDF (with auto CSS & image fixing)
========================================================= */
export async function generatePDF(templateData) {
  try {
    /* -----------------------------------------------
       1️⃣ Load HTML template
    ------------------------------------------------ */
    const templatePath = path.join(__dirname, "../templates/report.html");
    let html = fs.readFileSync(templatePath, "utf8");

    /* -----------------------------------------------
       2️⃣ Load CSS + inject it inside <style>
    ------------------------------------------------ */
    const cssPath = path.join(__dirname, "../templates/report.css");
    let css = "";

    if (fs.existsSync(cssPath)) {
      css = fs.readFileSync(cssPath, "utf8");
    }

    // Inject CSS into templateData
    templateData.inlineCSS = css;

    /* -----------------------------------------------
       3️⃣ Compile Handlebars template
    ------------------------------------------------ */
    const template = handlebars.compile(html);

    // Produce final HTML
    let finalHTML = template(templateData);

    /* -----------------------------------------------
       4️⃣ Sanitize to prevent broken HTML
    ------------------------------------------------ */
    finalHTML = sanitizeHtml(finalHTML, {
      allowedTags: false, // allow all
      allowedAttributes: false, // allow all
      allowedSchemes: ["data", "http", "https"],
      allowedSchemesByTag: { img: ["data", "http", "https"] },
    });

    /* -----------------------------------------------
       5️⃣ Convert any img path to Base64 for PDF reliability
    ------------------------------------------------ */
    finalHTML = await convertImagesToBase64(finalHTML);

    /* -----------------------------------------------
       6️⃣ Launch Puppeteer with safe production flags
    ------------------------------------------------ */
    const browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--font-render-hinting=none",
      ],
    });

    const page = await browser.newPage();

    /* -----------------------------------------------
       7️⃣ Load HTML into Puppeteer
    ------------------------------------------------ */
    await page.setContent(finalHTML, {
      waitUntil: ["domcontentloaded", "networkidle0"],
    });

    /* -----------------------------------------------
       8️⃣ Generate high-quality PDF
    ------------------------------------------------ */
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "0mm",
        bottom: "0mm",
        left: "0mm",
        right: "0mm",
      },
    });

    await browser.close();
    return pdfBuffer;
  } catch (err) {
    console.error("❌ PDF Generation Error:", err);
    throw new Error("Failed to generate PDF");
  }
}

/* =========================================================
   📦 Convert <img src="..."> → Base64
========================================================= */
async function convertImagesToBase64(html) {
  const regex = /<img[^>]+src="([^">]+)"/g;
  let match;

  while ((match = regex.exec(html))) {
    const imgPath = match[1];

    // Skip URLs & Base64 images — KEEP THEM!
    if (imgPath.startsWith("http") || imgPath.startsWith("data:image")) {
      continue;
    }

    const absolutePath = path.join(process.cwd(), imgPath);

    if (fs.existsSync(absolutePath)) {
      const ext = path.extname(absolutePath).substring(1);
      const base64 = fs.readFileSync(absolutePath, "base64");
      const base64URL = `data:image/${ext};base64,${base64}`;
      html = html.replace(imgPath, base64URL);
    } else {
      console.warn("⚠️ Could not convert image:", imgPath);
    }
  }

  return html;
}

