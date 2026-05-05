# syntax=docker/dockerfile:1.6

# ============ Build stage ============
FROM node:20-slim AS builder
WORKDIR /app

# Install package manifests first for better Docker layer caching
COPY package.json package-lock.json ./
COPY packages/api/package.json ./packages/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/web/package.json ./packages/web/

# Install ALL deps (incl. dev — needed for tsc/vite/esbuild at build time)
# Use npm install instead of npm ci — npm ci has a known bug where platform-specific
# optional deps (rollup native binaries) get dropped from package-lock.json on cross-platform installs.
RUN npm install --no-audit --no-fund

# Copy source and build (creates packages/{shared,api,web}/dist)
COPY . .
RUN npm run build

# ============ Runtime stage ============
FROM node:20-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# wget for HEALTHCHECK
RUN apt-get update && apt-get install -y --no-install-recommends wget \
    && rm -rf /var/lib/apt/lists/*

# All 3 workspace manifests must be present for `npm ci --workspaces` to resolve.
# We don't need shared/web source — esbuild bundled @250-500/shared into the api server,
# and the web package only contributes static assets at runtime.
COPY package.json package-lock.json ./
COPY packages/api/package.json ./packages/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/web/package.json ./packages/web/

# Install runtime deps only (npm install for same reason as above)
RUN npm install --no-audit --no-fund --omit=dev --workspaces --include-workspace-root

# Copy built artifacts from the builder stage
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/web/dist ./packages/web/dist

# Healthcheck (Railway also has its own; this is for portable Docker use)
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:${PORT}/health || exit 1

EXPOSE 3001

CMD ["node", "packages/api/dist/server.js"]
