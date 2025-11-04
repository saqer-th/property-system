# -------------------------------------------------------------
# 🧱 1. Base image with Node & all system libs Puppeteer needs
# -------------------------------------------------------------
FROM node:20-bookworm-slim

# Prevent Puppeteer from crashing due to low /dev/shm
RUN mkdir -p /dev/shm && chmod 1777 /dev/shm

# Install Chrome runtime dependencies (not Chrome itself)
RUN apt-get update && apt-get install -y \
  ca-certificates fonts-liberation xdg-utils \
  libasound2 libatk-bridge2.0-0 libatk1.0-0 libcups2 \
  libdbus-1-3 libdrm2 libgbm-dev libgtk-3-0 libnspr4 libnss3 \
  libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 \
  libxkbcommon0 libxshmfence1 libxext6 libxfixes3 libxi6 \
  libxrender1 libxss1 libxtst6 libu2f-udev libvulkan1 \
  --no-install-recommends && rm -rf /var/lib/apt/lists/*

# -------------------------------------------------------------
# 🧱 2. Working directory
# -------------------------------------------------------------
WORKDIR /app

# -------------------------------------------------------------
# 🧱 3. Install dependencies (PM2 + project)
# -------------------------------------------------------------
COPY package*.json ./
RUN npm install -g pm2 && npm ci

# -------------------------------------------------------------
# 🧱 4. Copy app source
# -------------------------------------------------------------
COPY . .

# -------------------------------------------------------------
# 🧱 5. Shared folder for WhatsApp session data
# -------------------------------------------------------------
RUN mkdir -p /app/.wadata && chmod -R 777 /app/.wadata

# -------------------------------------------------------------
# 🧱 6. Environment defaults
# -------------------------------------------------------------
ENV PORT=8085
ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
ENV PUPPETEER_CACHE_DIR=/root/.cache/puppeteer

# -------------------------------------------------------------
# 🧱 7. Add PM2 config and expose both ports
# -------------------------------------------------------------
COPY pm2.config.cjs ./pm2.config.cjs
EXPOSE 8085 8002

# -------------------------------------------------------------
# 🧱 8. Launch PM2 Runtime (keeps both apps alive)
# -------------------------------------------------------------
CMD ["npx", "pm2-runtime", "start", "pm2.config.cjs", "--env", "production"]
