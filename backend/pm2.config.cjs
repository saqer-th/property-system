const os = require("os");
const path = require("path");

const isWindows = os.platform() === "win32";

module.exports = {
  apps: [
    {
      name: "property-system",
      script: "server.js",
      cwd: isWindows
        ? "C:/Users/Saqriii/property-system/backend" // 💻 جهازك المحلي (Windows)
        : "/root/property-system/backend",            // ☁️ السيرفر (Linux)
      exec_mode: "fork",
      instances: 1,
      watch: false,
      autorestart: true,
      env: {
        NODE_ENV: "production",
        PORT: 8085,
        ...(isWindows
          ? {}
          : { PUPPETEER_EXECUTABLE_PATH: "/usr/bin/chromium-browser" }),
      },
    },
  ],
};
