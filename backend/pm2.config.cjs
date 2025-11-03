module.exports = {
  apps: [
    // 💬 WhatsApp Socket API (open-wa)
    {
      name: "wa-automate",
      script: "npx",
      args: "@open-wa/wa-automate --socket --port 8002 --api-key " + process.env.WA_API_KEY,
      env: {
        PORT: 8002,
        DATA_PATH: "/app/.wadata", // ensure sessions saved here
      },
    },

    // 🟢 Backend server (starts after wa-automate)
    {
      name: "backend",
      script: "bash",
      args: ["-c", "sleep 10 && node server.js"], // wait 10s to ensure WhatsApp socket is ready
      env: {
        PORT: 8085,
        WA_API_URL: "http://localhost:8002",
        WA_API_KEY: process.env.WA_API_KEY,
        NODE_ENV: "production",
      },
    },
  ],
};
