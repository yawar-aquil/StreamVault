#!/bin/bash

# Configuration
APP_DIR="/var/www/streamvault" # Change this to your actual app directory if different
NGINX_CONFIG_SRC="nginx.conf"
NGINX_sites_AVAILABLE="/etc/nginx/sites-available"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
DOMAIN_CONFIG_NAME="streamvault"

echo "🚀 Starting Deployment..."

# 1. Pull latest changes
echo "📥 Pulling latest changes from Git..."
git pull origin main

# 2. Install dependencies (if any new ones)
echo "📦 Installing dependencies..."
npm install

# 3. Build the project
echo "🏗️ Building project..."
npm run build

# 4. Setup Nginx Configuration
echo "wnu Configuring Nginx..."

# Check if Nginx config exists in the repo
if [ -f "$NGINX_CONFIG_SRC" ]; then
    echo "Found $NGINX_CONFIG_SRC, updating system configuration..."
    
    # Backup existing config if it exists
    if [ -f "$NGINX_sites_AVAILABLE/$DOMAIN_CONFIG_NAME" ]; then
        sudo cp "$NGINX_sites_AVAILABLE/$DOMAIN_CONFIG_NAME" "$NGINX_sites_AVAILABLE/$DOMAIN_CONFIG_NAME.bak"
    fi

    # Copy new config
    sudo cp "$NGINX_CONFIG_SRC" "$NGINX_sites_AVAILABLE/$DOMAIN_CONFIG_NAME"

    # Create symlink if it doesn't exist
    if [ ! -f "$NGINX_SITES_ENABLED/$DOMAIN_CONFIG_NAME" ]; then
        sudo ln -s "$NGINX_sites_AVAILABLE/$DOMAIN_CONFIG_NAME" "$NGINX_SITES_ENABLED/"
    fi
else
    echo "⚠️ Warning: $NGINX_CONFIG_SRC not found in current directory!"
fi

# 5. Restart Services
echo "🔄 Restarting services..."

# Test Nginx config
if sudo nginx -t; then
    echo "✅ Nginx configuration is valid."
    sudo systemctl restart nginx
    echo "✅ Nginx restarted."
else
    echo "❌ Nginx configuration failed! Not restarting."
    exit 1
fi

# Restart Node/PM2 process (assuming pm2 is used, straightforward to add)
if command -v pm2 &> /dev/null; then
    pm2 restart streamvault || pm2 start dist/index.js --name streamvault
    echo "✅ PM2 process restarted."
else
    echo "⚠️ PM2 not found. You may need to manually restart your node server."
fi

echo "✨ Deployment Complete! Verify at https://streamvault.in"
