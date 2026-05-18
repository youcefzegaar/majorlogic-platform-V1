# Base image
FROM node:20-slim AS base

# Install dependencies needed for some native packages if any
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY turbo.json ./

# Copy all packages and apps
COPY packages ./packages
COPY apps ./apps
COPY domains ./domains
COPY scripts ./scripts
COPY rulesets ./rulesets
COPY examples ./examples

# Install all dependencies (Turborepo will handle this)
RUN npm install

# Build the project (if there are build steps, e.g. for React apps)
RUN npx turbo run build

# Production image
FROM node:20-slim AS runner
WORKDIR /app

COPY --from=base /app /app

EXPOSE 3010

# Start the API server by default
CMD ["npm", "run", "start:api"]
