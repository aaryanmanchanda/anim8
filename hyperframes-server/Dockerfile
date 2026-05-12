FROM ghcr.io/puppeteer/puppeteer:22

USER root
RUN apt-get update && apt-get install -y ffmpeg --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

EXPOSE 3001
CMD ["node", "server.js"]
