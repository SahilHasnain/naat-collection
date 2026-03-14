#!/bin/bash

# Setup SSL certificates for Live Radio streaming
DOMAIN="owaisrazaqadri.duckdns.org"
EMAIL="mdsahil1631@gmail.com"

echo "Setting up SSL certificates for $DOMAIN"
echo "=========================================="

# Create directories
mkdir -p certbot/conf
mkdir -p certbot/www

# Check if certificates already exist
if [ -d "certbot/conf/live/$DOMAIN" ]; then
    echo "⚠ Certificates already exist for $DOMAIN"
    read -p "Do you want to renew them? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Using existing certificates..."
        docker compose -f docker-compose-ssl.yml up -d
        echo "✓ Services started with existing SSL"
        exit 0
    fi
fi

# Step 1: Start nginx with HTTP-only config
echo ""
echo "Step 1: Starting nginx with HTTP-only configuration..."
docker rm -f nginx-temp 2>/dev/null
docker run -d --name nginx-temp \
    --network live-radio_radio-network \
    -p 80:80 \
    -v "$(pwd)/nginx-http-only.conf:/etc/nginx/nginx.conf:ro" \
    -v "$(pwd)/certbot/www:/var/www/certbot:ro" \
    nginx:alpine

# Wait for nginx to start
sleep 3

# Test nginx
echo "Testing nginx..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:80 | grep -q "200"; then
    echo "✓ Nginx is running on port 80"
else
    echo "✗ Nginx failed to start"
    docker logs nginx-temp
    docker rm -f nginx-temp
    exit 1
fi

# Step 2: Request certificate
echo ""
echo "Step 2: Requesting SSL certificate from Let's Encrypt..."
docker run --rm \
    --network live-radio_radio-network \
    -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
    -v "$(pwd)/certbot/www:/var/www/certbot" \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN

if [ $? -eq 0 ]; then
    echo "✓ SSL certificate obtained successfully!"
    
    # Step 3: Stop temporary nginx and start full stack
    echo ""
    echo "Step 3: Starting full stack with SSL..."
    docker rm -f nginx-temp
    
    # Start full docker-compose stack with SSL
    docker compose -f docker-compose-ssl.yml up -d
    
    # Wait for services
    sleep 5
    
    echo ""
    echo "=========================================="
    echo "✓ Setup complete!"
    echo ""
    echo "Your stream is now available at:"
    echo "  https://$DOMAIN/live"
    echo ""
    echo "API endpoints:"
    echo "  https://$DOMAIN/api/current"
    echo "  https://$DOMAIN/health"
    echo ""
    echo "Testing HTTPS..."
    if curl -k -s -o /dev/null -w "%{http_code}" https://localhost:443 | grep -q "200"; then
        echo "✓ HTTPS is working!"
    else
        echo "⚠ HTTPS test failed, but certificates are installed"
        echo "  Try accessing from outside: https://$DOMAIN/health"
    fi
else
    echo "✗ Failed to obtain SSL certificate"
    echo ""
    echo "Please check:"
    echo "  1. Your domain $DOMAIN points to this server's IP"
    echo "     Test: curl http://$DOMAIN"
    echo "  2. Ports 80 and 443 are open in your firewall"
    echo "     Test: sudo netstat -tulpn | grep ':80\\|:443'"
    echo "  3. Domain DNS has propagated"
    echo "     Test: nslookup $DOMAIN"
    echo ""
    docker rm -f nginx-temp
    exit 1
fi
