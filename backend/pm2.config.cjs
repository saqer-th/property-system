export default {
  apps: [
    {
      name: "backend",
      script: "server.js",
      cwd: "./backend", // 👈 مهم
      instances: 1,
      exec_mode: "fork",
      watch: false,
      autorestart: true, // ✅ يخلي السيرفر يستمر
      env: {
        NODE_ENV: "production",
        PORT: 8085,
      },
    },
  ],
};
