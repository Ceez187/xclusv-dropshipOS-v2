FROM node:22-slim

WORKDIR /app

COPY server/package*.json ./
RUN npm ci --omit=dev

COPY server/src ./src

ENV PORT=8080
EXPOSE 8080

CMD ["npx", "tsx", "src/index.ts"]
