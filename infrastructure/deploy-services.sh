#!/bin/bash
# CT Business Automations - Service Deployment Script

set -euo pipefail

echo "🚀 Deploying CT Business Automations Platform"
echo "============================================"

# Check if .env exists
if [ ! -f "/opt/ct-automations/.env" ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy .env.template to .env and configure it first."
    exit 1
fi

# Load environment variables
cd /opt/ct-automations
source .env

# Create required directories
echo "📁 Creating directories..."
mkdir -p nginx/ssl
mkdir -p logs/{api,nginx,n8n}
mkdir -p backups/{postgres,files}
mkdir -p monitoring/grafana/{dashboards,datasources}

# Copy configuration files
echo "📋 Copying configuration files..."
cp /home/ubuntu/ct-automation-site/infrastructure/docker-compose.yml .
cp -r /home/ubuntu/ct-automation-site/infrastructure/nginx/* ./nginx/
cp -r /home/ubuntu/ct-automation-site/infrastructure/init-scripts .
cp -r /home/ubuntu/ct-automation-site/infrastructure/monitoring/* ./monitoring/

# Generate random webhook paths if not exists
if [ -z "${WEBHOOK_PATH_RANDOM:-}" ]; then
    echo "🔐 Generating random webhook paths..."
    echo "WEBHOOK_PATH_RANDOM=$(openssl rand -hex 16)" >> .env
fi

# Pull Docker images
echo "🐳 Pulling Docker images..."
docker compose pull

# Start core services first
echo "🔧 Starting core services..."
docker compose up -d postgres redis

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL..."
sleep 10

# Start remaining services
echo "🚀 Starting all services..."
docker compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 30

# Check service status
echo "✅ Checking service status..."
docker compose ps

# Create first admin user
echo "👤 Creating admin user..."
docker compose exec api npm run create-admin || echo "Admin creation will be available after API is built"

# Show access URLs
echo ""
echo "🎉 Deployment complete!"
echo "======================"
echo ""
echo "📍 Access URLs:"
echo "API: https://api.ctbusinessautomations.com"
echo "N8N Webhooks: https://n8n.ctbusinessautomations.com/webhook/"
echo "Admin Portal: https://admin.ctbusinessautomations.com"
echo ""
echo "⚠️  Important next steps:"
echo "1. Set up SSL certificates (run setup-ssl.sh)"
echo "2. Configure DNS records for all subdomains"
echo "3. Update firewall rules if needed"
echo "4. Test all endpoints"
echo ""
echo "📊 View logs:"
echo "docker compose logs -f [service-name]"
echo ""
echo "🔄 Useful commands:"
echo "docker compose restart [service]  - Restart a service"
echo "docker compose down              - Stop all services"
echo "docker compose up -d             - Start all services"