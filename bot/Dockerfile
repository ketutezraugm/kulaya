# Warung Agent bot: Telegram + Gemini agent + relayer + HTTP API on :8787
# build: docker build -t warung-bot ./bot     run: docker run --env-file bot/.env -p 8787:8787 -v warung-data:/app/.cache warung-bot
FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
# secrets come from the environment (--env-file / host secret store), never from the image
ENV PORT=8787
EXPOSE 8787
CMD ["npx", "tsx", "src/index.ts"]
