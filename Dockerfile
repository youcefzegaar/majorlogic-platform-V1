# ── Stage 1: Install & Build ─────────────────────────────────────────────────
FROM node:20-slim AS builder

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first (cached layer)
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/admin-ui/package*.json ./apps/admin-ui/
COPY packages/*/package*.json ./packages/
RUN npm install --legacy-peer-deps

# Copy source
COPY packages ./packages
COPY apps/api ./apps/api
COPY apps/admin-ui ./apps/admin-ui
COPY domains ./domains
COPY scripts ./scripts
COPY rulesets ./rulesets
COPY examples ./examples

# Build admin-ui (served by the API at /admin/*)
RUN cd apps/admin-ui && npm run build

# ── Stage 2: Production Image ─────────────────────────────────────────────────
FROM node:20-slim AS runner

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy only what the API needs at runtime
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/apps/admin-ui/dist ./apps/admin-ui/dist
COPY --from=builder /app/domains ./domains
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/rulesets ./rulesets
COPY --from=builder /app/examples ./examples

EXPOSE 3010

CMD ["node", "apps/api/src/server.js"]
