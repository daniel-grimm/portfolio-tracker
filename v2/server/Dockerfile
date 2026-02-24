# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Copy workspace root manifests
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/

# Install all workspace dependencies
RUN npm ci --workspace=shared --workspace=server

# Copy source
COPY shared/ ./shared/
COPY server/ ./server/

# Build shared types (emits dist/types.d.ts for server import)
WORKDIR /app/shared
RUN npx tsc -p tsconfig.json

# Build server
WORKDIR /app/server
RUN npx tsc -p tsconfig.build.json

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app

# Copy workspace root manifests for production install
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/

# Production deps only
RUN npm ci --workspace=shared --workspace=server --omit=dev

# Copy compiled outputs
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/server/dist ./server/dist

# Copy migrations so db:migrate can run on startup
COPY --from=builder /app/server/src/db/migrations ./server/dist/db/migrations

WORKDIR /app/server

EXPOSE 3000

CMD ["node", "dist/index.js"]
