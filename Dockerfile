# Single-stage build (small enough for a portfolio site).
# Pin to a digest later if you want full reproducibility.
FROM node:24.10.0-alpine3.22 AS builder

WORKDIR /app

# pnpm via corepack
RUN corepack enable && corepack prepare pnpm@8 --activate

# Build-time env vars baked into the Next.js bundle.
# Pass via: docker build --build-arg NEXT_PUBLIC_YOUTUBE_CHANNEL_ID=UC...
ARG NEXT_PUBLIC_YOUTUBE_CHANNEL_ID=""
ENV NEXT_PUBLIC_YOUTUBE_CHANNEL_ID=$NEXT_PUBLIC_YOUTUBE_CHANNEL_ID

# Install deps. The project intentionally doesn't track a lockfile
# (.npmrc has shrinkwrap=false), so --frozen-lockfile would fail.
COPY package.json ./
RUN pnpm install --prefer-offline

# Copy source (respects .dockerignore)
COPY . .

# Build
RUN pnpm run build

EXPOSE 3000

# Drop privileges
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001
USER nextjs

# Server-only secrets (e.g., YOUTUBE_API_KEY) come in at runtime via:
#   docker run --env-file .env.local ...
CMD ["pnpm", "start"]
