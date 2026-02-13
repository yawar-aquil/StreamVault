#!/bin/bash

# StreamVault Server Setup Script
# Tested on Ubuntu 24.04 LTS
# Run with: sudo bash setup-server.sh

set -e

echo "🚀 Starting StreamVault Server Setup..."

# 1. Update System
echo "🔄 Updating system packages..."
apt update && apt upgrade -y

# 2. Install Essentials
echo "🛠️ Installing essential tools..."
apt install -y curl git unzip build-essential nginx certbot python3-certbot-nginx

# 3. Install Node.js 20
echo "🟢 Installing Node.js 20..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
else
    echo "Node.js is already installed."
fi

# 4. Install PM2 Global
echo "📦 Installing PM2..."
npm install -g pm2

# 5. Configure Firewall (UFW)
echo "🛡️ Configuring Firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
# ufw enable # Commented out to prevent locking out if SSH isn't allowed properly. User should enable manually if needed.

# 6. Configure Nginx
echo "🌐 Configuring Nginx..."
cat > /etc/nginx/sites-available/streamvault <<EOF
server {
    listen 80;
    server_name streamvault.live; # Updated domain

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/streamvault /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and Reload Nginx
nginx -t
systemctl reload nginx

echo "✅ Server setup complete!"
echo "👉 Next steps:"
echo "1. Clone your repo: git clone <your-repo-url> streamvault"
echo "2. cd streamvault"
echo "3. Setup .env file"
echo "4. Copy your 'data/' folder from local machine"
echo "5. Run 'npm ci' and 'npm run build'"
echo "6. Start with 'pm2 start ecosystem.config.cjs'"
