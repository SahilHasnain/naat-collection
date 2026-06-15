#!/bin/bash
set -e

DOMAIN="owaisrazaqadri.duckdns.org"
EMAIL="mdsahil1631@gmail.com"

mkdir -p certbot/conf certbot/www

if [ ! -d "certbot/conf/live/$DOMAIN" ]; then
    echo "Obtaining SSL certificate for $DOMAIN ..."
    docker run --rm -p 80:80 \
        -v "$(pwd)/nginx-http-only.conf:/etc/nginx/nginx.conf:ro" \
        -v "$(pwd)/certbot/www:/var/www/certbot:ro" \
        nginx:alpine &
    NGINX_PID=$!
    sleep 3

    docker run --rm \
        -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
        -v "$(pwd)/certbot/www:/var/www/certbot" \
        certbot/certbot certonly --webroot --webroot-path=/var/www/certbot \
        --email "$EMAIL" --agree-tos --no-eff-email -d "$DOMAIN"

    kill $NGINX_PID 2>/dev/null || true
    echo "Certificate obtained."
fi

docker compose up -d --build
echo "Live Radio is running at https://$DOMAIN/live"
