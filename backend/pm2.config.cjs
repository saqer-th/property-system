module.exports = {
  apps: [
    {
      name: "wa-automate",
      script: "npx",
      args: "@open-wa/wa-automate --socket --port 8002 --api-key " + process.env.WA_API_KEY,
    },
    {
      name: "backend",
      script: "bash",
      args: ["-c", "sleep 10 && node server.js"], // wait 10s before starting backend
      env: {
        PORT: 8085,
        WA_API_URL: "http://localhost:8002",
        WA_API_KEY: process.env.WA_API_KEY,
      },
    },
  ],
};
