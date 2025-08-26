# ── Stage 1: Builder (using Debian to install Node + package manager) ──
FROM debian:bookworm-slim AS builder
WORKDIR /app

# Install curl, node‑build deps, unzip
RUN apt-get update && apt-get install -y \
      curl gnupg ca-certificates build-essential unzip netcat-openbsd \
  && rm -rf /var/lib/apt/lists/*

# Install Node.js 20.x via NodeSource
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get update && apt-get install -y nodejs \
  && rm -rf /var/lib/apt/lists/*

# Install all package managers via Corepack
RUN npm install --global corepack@latest \
  && corepack enable pnpm yarn npm

# Copy package files to detect lock file type
COPY package.json ./
COPY pnpm-lock.yaml* ./
COPY yarn.lock* ./
COPY package-lock.json* ./

# Determine package manager based on lock file presence
RUN \
  if [ -f "pnpm-lock.yaml" ]; then \
    echo "Using pnpm" && corepack prepare pnpm@latest --activate && export PNPM_HOME="/pnpm" && export PATH="/pnpm:${PATH}"; \
  elif [ -f "yarn.lock" ]; then \
    echo "Using yarn" && corepack prepare yarn@stable --activate; \
  else \
    echo "Using npm"; \
  fi

# Install project dependencies
RUN \
  if [ -f "pnpm-lock.yaml" ]; then \
    pnpm install --frozen-lockfile; \
  elif [ -f "yarn.lock" ]; then \
    yarn install --frozen-lockfile; \
  else \
    npm ci; \
  fi

# Copy prisma, source, TS config, and your SPAs
COPY prisma ./prisma
COPY src ./src
COPY tsconfig*.json ./

# Generate Prisma Client (for build)
RUN \
  if [ -f "pnpm-lock.yaml" ]; then \
    pnpm exec prisma generate; \
  elif [ -f "yarn.lock" ]; then \
    yarn exec prisma generate; \
  else \
    npx prisma generate; \
  fi

# Build NestJS application
RUN \
  if [ -f "pnpm-lock.yaml" ]; then \
    pnpm run build; \
  elif [ -f "yarn.lock" ]; then \
    yarn run build; \
  else \
    npm run build; \
  fi

# ── Stage 2: Production (Debian + bun runtime) ──
FROM debian:bookworm-slim AS prod
WORKDIR /app

# Install curl/unzip (bun installer needs them)
RUN apt-get update && apt-get install -y \
      curl unzip ca-certificates netcat-openbsd \
  && rm -rf /var/lib/apt/lists/*

# Install bun runtime via official install script
RUN curl -fsSL https://bun.com/install | bash

# Make bun CLI globally available
ENV BUN_INSTALL="/root/.bun" \
    PATH="/root/.bun/bin:${PATH}"

# Copy only runtime artifacts from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE 8080
COPY start.sh .
RUN chmod +x start.sh
CMD ["./start.sh"]
