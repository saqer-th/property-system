# =====================================================
# 🧱 1. Base image
# =====================================================
FROM node:20-bookworm-slim

# =====================================================
# 🧩 2. Install Chromium (for Puppeteer / Open-WA)
# =====================================================
RUN apt-get update && apt-get install -y \
  chromium \
  fonts-liberation \
  libatk-bridge2.0-0 \
  libgtk-3-0 \
  libx11-xcb1 \
  libnss3 \
  libxss1 \
  libasound2 \
  libdrm2 \
  libgbm1 \
  libxdamage1 \
  libxcomposite1 \
  libxrandr2 \
  libxkbcommon0 \
  libxshmfence1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

# =====================================================
# ⚙️ 3. Set working directory
# =====================================================
WORKDIR /app

# =====================================================
# 📦 4. Install dependencies
# =====================================================
COPY package*.json ./
RUN npm install pm2 -g && npm install

# =====================================================
# 📁 5. Copy source code
# =====================================================
COPY . .

# =====================================================
# 🌍 6. Environment variables
# =====================================================
ENV NODE_ENV=production
ENV PORT=8085
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# =====================================================
# 🧠 7. Expose ports (optional)
# =====================================================
EXPOSE 8085

# =====================================================
# 🚀 8. Start app via PM2
# =====================================================
CMD ["pm2-runtime", "start", "pm2.config.cjs", "--env", "production"]
