#!/bin/bash

# Stop script on first error
set -e

echo "🚀 Starting StreamVault Deployment..."

# 1. Pull latest changes
echo "📥 Pulling latest changes from git..."
git pull origin main

# 2. Install dependencies
echo "📦 Installing dependencies..."
npm ci

# 3. Build the application
echo "🛠️ Building application..."
npm run build

# 4. Restart the server using PM2
echo "🔄 Reloading application..."
# Start if not running, or reload if running (zero downtime if clustered, but here just restart)
pm2 startOrReload ecosystem.config.cjs --env production

echo "✅ Deployment successfully completed!"
