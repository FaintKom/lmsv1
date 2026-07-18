# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

ENV NEXT_PUBLIC_API_URL=""

COPY . .

# Bound the build heap. Images are built in CI since 2026-07-19, but the
# deploy keeps a transitional on-server build fallback (and the 2026-07-17
# OOM-thrash incident proved an unbounded `next build` can take the host
# down) — keep the cap so any build, wherever it runs, dies alone.
ENV NODE_OPTIONS=--max-old-space-size=1536
RUN npm run build

# Stage 2: Production
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy standalone build output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
