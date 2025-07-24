#!/bin/bash
# CT Business Automations - VPS Setup Script
# Run this on a fresh Ubuntu 22.04 server

set -euo pipefail

echo "🚀 CT Business Automations Platform - Server Setup"
echo "================================================"

# Update system
echo "📦 Updating system packages..."
apt-get update && apt-get upgrade -y

# Install essential packages
echo "🔧 Installing essential packages..."
apt-get install -y \
    curl \
    wget \
    git \
    ufw \
    fail2ban \
    unattended-upgrades \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

# Set up firewall
echo "🔥 Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable

# Install Docker
echo "🐳 Installing Docker..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Configure Docker
usermod -aG docker $USER
systemctl enable docker
systemctl start docker

# Set up fail2ban
echo "🛡️ Configuring fail2ban..."
cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
systemctl enable fail2ban
systemctl start fail2ban

# Create directory structure
echo "📁 Creating directory structure..."
mkdir -p /opt/ct-automations/{data,logs,backups,configs}
mkdir -p /opt/ct-automations/data/{postgres,redis,n8n}

# Set up automatic security updates
echo "🔐 Enabling automatic security updates..."
echo 'Unattended-Upgrade::Automatic-Reboot "false";' >> /etc/apt/apt.conf.d/50unattended-upgrades
echo 'Unattended-Upgrade::Automatic-Reboot-Time "02:00";' >> /etc/apt/apt.conf.d/50unattended-upgrades

# Create environment file
echo "📝 Creating environment template..."
cat > /opt/ct-automations/.env.template << 'EOF'
# CT Business Automations Platform Environment Variables
# Copy this to .env and fill in your values

# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=ct_automations
DB_USER=ct_admin
DB_PASSWORD=CHANGE_ME_STRONG_PASSWORD

# Redis
REDIS_PASSWORD=CHANGE_ME_STRONG_PASSWORD

# N8N
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=CHANGE_ME_STRONG_PASSWORD
N8N_ENCRYPTION_KEY=CHANGE_ME_32_CHAR_HEX
N8N_HOST=n8n.ctbusinessautomations.com
N8N_PROTOCOL=https
N8N_WEBHOOK_URL=https://n8n.ctbusinessautomations.com/

# API
JWT_SECRET=CHANGE_ME_LONG_RANDOM_STRING
API_KEY_SALT=CHANGE_ME_ANOTHER_RANDOM_STRING
ENCRYPTION_KEY=CHANGE_ME_64_CHAR_HEX

# Monitoring
GRAFANA_ADMIN_PASSWORD=CHANGE_ME_STRONG_PASSWORD

# Backups
BACKUP_ENCRYPTION_KEY=CHANGE_ME_SEPARATE_KEY
S3_BACKUP_BUCKET=ct-automations-backups
AWS_ACCESS_KEY_ID=YOUR_AWS_KEY
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET
EOF

echo "✅ VPS setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Copy .env.template to .env and fill in secure values"
echo "2. Set up SSL certificates (run setup-ssl.sh)"
echo "3. Deploy services (run deploy-services.sh)"
echo ""
echo "🔐 Security reminders:"
echo "- Change all default passwords"
echo "- Set up SSH key authentication"
echo "- Disable root login"
echo "- Configure DNS for your domains"