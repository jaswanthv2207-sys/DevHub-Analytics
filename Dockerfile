# syntax=docker/dockerfile:1
# ── Build stage: workspace install + compile both packages ──────────────────
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci

COPY . .
RUN npm run build

# ── Runtime stage: production dependencies only ─────────────────────────────
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --omit=dev --workspace server

COPY --from=build /app/server/dist server/dist
COPY --from=build /app/client/dist client/dist

# Persist the SQLite database outside the container with a volume.
VOLUME ["/app/server/data"]
ENV DATABASE_PATH=/app/server/data/devhub.db
EXPOSE 4000

USER node
CMD ["node", "server/dist/index.js"]
