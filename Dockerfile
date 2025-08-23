FROM node:20-slim

# Install dependencies required by puppeteer
RUN apt-get update && apt-get install -y \
  chromium \
  libgconf-2-4 \
  libnss3 \
  libxss1 \
  libasound2 \
  fonts-liberation \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdrm2 \
  libgbm1 \
  libxkbcommon0 \
  libxcomposite1 \
  libxrandr2 \
  libgtk-3-0 \
  libxdamage1 \
  wget \
  xdg-utils \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

CMD ["node", "WhatsAppGroupAIAssitant.js"]
