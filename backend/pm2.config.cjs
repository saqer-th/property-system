module.exports = {
  apps: [
    {
      name: "wa-automate",
      script: "npx",
      args:
        "@open-wa/wa-automate --socket --port 8002 --api-key " +
        (process.env.WA_API_KEY || "changeme123") +
        " --use-chrome --headless --log-qr --session-dir /app/.wadata/_IGNORE_session",
      env: {
        PORT: 8002,
        DATA_PATH: "/app/.wadata",
      },
      autorestart: true,
      exp_backoff_restart_delay: 5000,
    },
    {
      name: "backend",
      script: "bash",
      args: ["-c", "sleep 15 && node server.js"],
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
