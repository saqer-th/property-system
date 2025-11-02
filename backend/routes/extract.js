import express from "express";
import multer from "multer";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/api/extract", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const filePath = path.resolve(req.file.path);
    const pyPath = path.resolve("extract/extract_ejar.py");

    // 🐍 Run Python script and get JSON result
    const py = spawn("python", [pyPath, filePath]);

    let output = "";
    let errorOutput = "";

    py.stdout.on("data", (data) => (output += data.toString()));
    py.stderr.on("data", (data) => (errorOutput += data.toString()));

    py.on("close", (code) => {
      fs.unlinkSync(filePath); // cleanup uploaded PDF
      if (code !== 0 || !output.trim()) {
        console.error("Python error:", errorOutput);
        return res.status(500).json({ error: "Extraction failed", details: errorOutput });
      }

      try {
        // Your Python prints "[OK] JSON saved -> path", so we’ll load that file
        const match = output.match(/JSON saved -> (.+\.json)/);
        if (!match) throw new Error("No JSON file path found in Python output");

        const jsonPath = match[1].trim();
        const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
        fs.unlinkSync(jsonPath);
        res.json(data);
      } catch (err) {
        console.error("Parse error:", err);
        res.status(500).json({ error: "Failed to parse JSON", details: err.message });
      }
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
