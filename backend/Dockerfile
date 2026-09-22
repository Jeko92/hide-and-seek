# syntax=docker/dockerfile:1

FROM oven/bun:1 AS builder
WORKDIR /app

COPY package.json bun.lock ./
COPY packages ./packages
COPY backend/package.json backend/package.json
RUN bun install --frozen-lockfile

COPY backend/src backend/src
COPY backend/tsconfig*.json backend/nest-cli.json backend/
RUN bun run --filter backend build

FROM oven/bun:1-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/package.json ./backend/package.json

EXPOSE 3000
USER bun
CMD ["bun", "backend/dist/main.js"]
