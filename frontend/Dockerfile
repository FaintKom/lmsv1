# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

ENV NEXT_PUBLIC_API_URL=""

COPY . .

# Bound the build heap. This image is built ON the 4GB prod box next to the
# running stack, so an unbounded `next build` swaps the whole host into
# unresponsiveness instead of failing (incident 2026-07-17). Bounded, Node
# dies alone and the deploy fails loudly with the host intact.
# Remove once images are built in CI and the server only pulls them.
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
