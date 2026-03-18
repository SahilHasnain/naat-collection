#!/bin/bash

# Deployment script for Naat AI Service on DigitalOcean
# Run this script on your droplet after cloning the repo

set -e

echo "=== Naat AI Service Deployment ==="

# Update system
echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker if not already installed
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
fi

# Install Docker Compose if not already installed
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Install Nginx
echo "Installing Nginx..."
sudo apt install -y nginx

# Install Certbot for Let's Encrypt
echo "Installing Certbot..."
sudo apt install -y certbot python3-certbot-nginx

# Copy initial HTTP-only nginx config
echo "Configuring Nginx (HTTP only for now)..."
sudo cp nginx-http.conf /etc/nginx/sites-available/naat-ai
sudo ln -sf /etc/nginx/sites-available/naat-ai /etc/nginx/sites-enabled/naat-ai
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx config
sudo nginx -t

# Start Docker service
echo "Starting Docker service..."
sudo systemctl start docker
sudo systemctl enable docker

# Build and start AI service
echo "Building AI service..."
docker-compose build

echo "Starting AI service..."
docker-compose up -d

# Wait for service to be ready
echo "Waiting for AI service to start..."
sleep 10

# Check if service is running
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✓ AI service is running"
else
    echo "✗ AI service failed to start"
    docker-compose logs
    exit 1
fi

# Reload Nginx
echo "Reloading Nginx..."
sudo systemctl reload nginx

echo ""
echo "=== Setup SSL Certificate ==="
echo "Run the following command to setup HTTPS:"
echo "./setup-ssl.sh"
echo ""
echo "After SSL setup, your service will be available at:"
echo "https://naat-ai.duckdns.org"
echo ""
echo "For now, service is available at:"
echo "http://naat-ai.duckdns.org"
echo ""
echo "=== Useful Commands ==="
echo "View logs: docker-compose logs -f"
echo "Restart service: docker-compose restart"
echo "Stop service: docker-compose down"
echo "Update service: git pull && docker-compose up -d --build"