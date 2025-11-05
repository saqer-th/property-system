module.exports = {
  apps: [
    {
      name: "backend",
      script: "server.js",
      cwd: "./backend",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      autorestart: true,
      env: {
        NODE_ENV: "production",
        PORT: 8085,
      },
    },
  ],
};
