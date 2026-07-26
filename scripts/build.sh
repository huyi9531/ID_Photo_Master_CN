#!/bin/bash
set -Eeuo pipefail

echo "Installing dependencies..."
pnpm install --prefer-frozen-lockfile --prefer-offline --loglevel debug --reporter=append-only

echo "Building the TanStack Start project..."
pnpm vite build

echo "Build completed successfully!"
