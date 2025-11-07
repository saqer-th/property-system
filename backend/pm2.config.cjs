module.exports = {
  apps: [
    {
      name: "property-system",
      script: "server.js",
      cwd: ".", // 👈 يغيّر مجلد العمل إلى backend
      exec_mode: "fork",
      instances: 1,
      watch: false,
      autorestart: true,
      env: {
        NODE_ENV: "production",
        PORT: 8085,
        PUPPETEER_EXECUTABLE_PATH: "/usr/bin/chromium-browser"
      }
    }
  ]
};
