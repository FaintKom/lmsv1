# vox-mcp — headless .vox toolkit exposed as an MCP server (stdio transport).
# Two-stage build: TypeScript compile in a builder image, runtime image has
# only the Cairo / Pango shared libs that node-canvas needs at runtime.
#
# Why bullseye-slim and not alpine: node-canvas links against Cairo + Pango,
# which build cleanly on glibc/Debian but are flaky on Alpine/musl.

FROM node:22-bullseye-slim AS build
WORKDIR /app

# Native deps for node-canvas at build time (compile cairo bindings).
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    python3 \
    pkg-config \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY tsconfig.json ./
COPY src ./src
RUN npx tsc -p tsconfig.json

# ----------------------------------------------------------------------------

FROM node:22-bullseye-slim AS runtime
WORKDIR /app

# Runtime shared libs only (no -dev variants).
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
 && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

# MCP stdio — no port exposed. Mount volumes for vox file access.
ENTRYPOINT ["node", "dist/server.js"]
