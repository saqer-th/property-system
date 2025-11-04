module.exports = {
  apps: [
    /* =========================================================
       💬 WhatsApp Socket API (open-wa)
       ========================================================= */
    {
      name: "wa-automate",
      script: "npx",
      args:
        "@open-wa/wa-automate --socket --port 8002 --api-key " +
        (process.env.WA_API_KEY || "changeme123") +
        " --use-puppeteer --headless --log-qr " +
        "--session-dir /app/.wadata/_IGNORE_session " +
        "--puppeteer-timeout 90000 " + // 🕒 give Chrome 60s to start
        "--puppeteer-headless 'new' " + // use Chromium’s modern headless mode
        "--puppeteer-chromium-args " +
        "\"--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --disable-gpu --single-process --no-zygote --disable-software-rasterizer\"",
      env: {
        PORT: 8002,
        DATA_PATH: "/app/.wadata", // persistent session storage
      },
      autorestart: true,
      exp_backoff_restart_delay: 5000, // auto-retry if Puppeteer crashes
    },

    /* =========================================================
       🟢 Backend Server (Express API)
       ========================================================= */
    {
      name: "backend",
      script: "bash",
      // Wait for WA socket to initialize before backend starts
      args: ["-c", "sleep 20 && node server.js"],
      env: {
        PORT: 8085,
        WA_API_URL: "http://localhost:8002",
        WA_API_KEY: process.env.WA_API_KEY || "changeme123",
        NODE_ENV: "production",
      },
      autorestart: true,
      exp_backoff_restart_delay: 5000,
    },
  ],
};
