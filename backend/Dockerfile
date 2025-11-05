# ==========================================================
# 🧩 Stage 1: Build Environment
# ==========================================================
FROM node:22-slim AS build

# 👇 تثبيت Chromium وكل الحزم اللازمة لتشغيل Puppeteer داخل Render
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-driver \
    fonts-liberation \
    libasound2 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    wget \
    ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# ==========================================================
# 🧩 Stage 2: App setup
# ==========================================================
WORKDIR /app

# نسخ الملفات
COPY package*.json ./
RUN npm install --production

COPY . .

# ==========================================================
# ⚙️ إعداد بيئة Puppeteer
# ==========================================================
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production
ENV TZ=Asia/Riyadh

# ==========================================================
# 🚀 Start the bot
# ==========================================================
CMD ["npm", "start"]
