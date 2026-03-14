#!/bin/bash

# Setup SSL certificates for Live Radio streaming
DOMAIN="owaisrazaqadri.duckdns.org"
EMAIL="mdsahil1631@gmail.com"

echo "Setting up SSL certificates for $DOMAIN"

# Create directories
mkdir -p certbot/conf
mkdir -p certbot/www

# Check if certificates already exist
if [ -d "certbot/conf/live/$DOMAIN" ]; then
    echo "Certificates already exist for $DOMAIN"
    read -p "Do you want to renew them? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
fi

# Start nginx temporarily for certificate generation
echo "Starting nginx for certificate generation..."
docker compose -f docker-compose-ssl.yml up -d nginx

# Wait for nginx to be ready
sleep 5

# Request certificate
echo "Requesting SSL certificate from Let's Encrypt..."
docker compose -f docker-compose-ssl.yml run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN

if [ $? -eq 0 ]; then
    echo "✓ SSL certificate obtained successfully!"
    echo "Restarting nginx with SSL..."
    docker compose -f docker-compose-ssl.yml restart nginx
    echo ""
    echo "Your stream is now available at:"
    echo "  https://$DOMAIN/live"
    echo ""
    echo "API endpoints:"
    echo "  https://$DOMAIN/api/current"
    echo "  https://$DOMAIN/health"
else
    echo "✗ Failed to obtain SSL certificate"
    echo "Please check:"
    echo "  1. Your domain $DOMAIN points to this server's IP"
    echo "  2. Ports 80 and 443 are open in your firewall"
    echo "  3. No other service is using ports 80 or 443"
    exit 1
fi
