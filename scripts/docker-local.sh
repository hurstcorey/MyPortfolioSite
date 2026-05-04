#!/usr/bin/env bash
# Build and run the portfolio site in Docker locally.
#
# Reads YOUTUBE_API_KEY, NEXT_PUBLIC_YOUTUBE_CHANNEL_ID, RESEND_API_KEY,
# and FROM_EMAIL from .env.local. Server-only vars are passed at runtime;
# NEXT_PUBLIC_* vars are passed as build args (Next.js inlines them).

set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env.local ]; then
  echo "ERROR: .env.local not found." >&2
  echo "  Copy .env.local.example and fill in your values:" >&2
  echo "    cp .env.local.example .env.local" >&2
  exit 1
fi

# Source env vars without exporting them globally
set -a
# shellcheck disable=SC1091
. ./.env.local
set +a

: "${NEXT_PUBLIC_YOUTUBE_CHANNEL_ID:?NEXT_PUBLIC_YOUTUBE_CHANNEL_ID must be set in .env.local}"

IMAGE="${IMAGE:-portfolio-local}"
CONTAINER="${CONTAINER:-portfolio-local}"
PORT="${PORT:-3000}"

# If a container with the same name is already running, stop it.
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "▶ Removing existing container ${CONTAINER}..."
  docker rm -f "${CONTAINER}" >/dev/null
fi

CACHE_FLAG=""
if [ "${NO_CACHE:-}" = "1" ]; then
  echo "▶ NO_CACHE=1 — building without layer cache"
  CACHE_FLAG="--no-cache"
fi

echo "▶ Building ${IMAGE}..."
docker build \
  ${CACHE_FLAG} \
  --build-arg "NEXT_PUBLIC_YOUTUBE_CHANNEL_ID=${NEXT_PUBLIC_YOUTUBE_CHANNEL_ID}" \
  -t "${IMAGE}" \
  .

echo ""
echo "▶ Running ${IMAGE} on http://localhost:${PORT} (Ctrl+C to stop)"
echo ""
docker run --rm \
  -p "${PORT}:3000" \
  --env-file .env.local \
  --name "${CONTAINER}" \
  "${IMAGE}"
