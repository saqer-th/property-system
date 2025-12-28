const os = require("os");

const isWindows = os.platform() === "win32";

module.exports = {
  apps: [
    // ======================
    // 🚀 PRODUCTION
    // ======================
    {
      name: "property-prod",
      script: "server.js",
      cwd: isWindows
        ? "C:/Users/Saqriii/property-system/backend"
        : "/root/property-system/backend",
      exec_mode: "fork",
      instances: 1,
      watch: false,
      autorestart: true,
      env: {
        NODE_ENV: "production",
        PORT: 8085,
        DISPLAY: ":99",

        // WhatsApp / Puppeteer
        WHATSAPP_ENABLED: "true",

        ...(isWindows
          ? {}
          : {
              PUPPETEER_EXECUTABLE_PATH: "/usr/bin/chromium-browser",
            }),
      },
    },

    // ======================
    // 🧪 STAGING
    // ======================
    {
      name: "property-staging",
      script: "server.js",
      cwd: isWindows
        ? "C:/Users/Saqriii/property-system/backend-staging"
        : "/root/property-system/backend-staging",
      exec_mode: "fork",
      instances: 1,
      watch: false,
      autorestart: true,
      env: {
        NODE_ENV: "staging",
        PORT: 4001,
        DISPLAY: ":99",

        // ❌ لا نرسل واتساب من Staging
        WHATSAPP_ENABLED: "false",

        ...(isWindows
          ? {}
          : {
              PUPPETEER_EXECUTABLE_PATH: "/usr/bin/chromium-browser",
            }),
      },
    },
  ],
};
