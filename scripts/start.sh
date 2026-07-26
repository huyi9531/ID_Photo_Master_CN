#!/bin/bash
set -Eeuo pipefail

PORT=5000
DEPLOY_RUN_PORT="${DEPLOY_RUN_PORT:-$PORT}"


start_service() {
    echo "Starting Cloudflare Worker preview on port ${DEPLOY_RUN_PORT} for deploy..."
    pnpm vite preview --host 0.0.0.0 --port "${DEPLOY_RUN_PORT}"
}

echo "Starting HTTP service on port ${DEPLOY_RUN_PORT} for deploy..."
start_service
