#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Deploying Venta from $ROOT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required on the server."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required on the server."
  exit 1
fi

if [ ! -f backend/.env ]; then
  echo "Missing backend/.env — create it on the server before deploying."
  exit 1
fi

echo "==> Pulling latest main"
git fetch origin main
git checkout main
git pull --ff-only origin main

echo "==> Backend: install, migrate, build"
cd backend
npm ci
npx prisma migrate deploy
npm run build

echo "==> Frontend: install, build"
cd ../frontend
if [ -f .env.local ]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi
npm ci
npm run build

cd "$ROOT_DIR"

echo "==> Restarting processes"
if command -v pm2 >/dev/null 2>&1; then
  if pm2 describe venta-backend >/dev/null 2>&1; then
    pm2 reload ecosystem.config.cjs --update-env
  else
    pm2 start ecosystem.config.cjs
  fi
  pm2 save
else
  echo "PM2 is not installed. Install it with: npm install -g pm2"
  echo "Then run: pm2 start ecosystem.config.cjs && pm2 save"
  exit 1
fi

echo "==> Deploy complete"
