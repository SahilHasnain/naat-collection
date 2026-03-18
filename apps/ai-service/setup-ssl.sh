#!/bin/bash

# SSL Certificate Setup Script
# Run this after deploy.sh completes successfully

set -e

echo "=== Setting up SSL Certificate with Let's Encrypt ==="

# Check if nginx is running
if ! systemctl is-active --quiet nginx; then
    echo "Starting Nginx..."
    sudo systemctl start nginx
fi

# Obtain SSL certificate
echo "Obtaining SSL certificate for naat-ai.duckdns.org..."
sudo certbot --nginx -d naat-ai.duckdns.org --non-interactive --agree-tos --email mdsahil1631@gmail.com --redirect

# Test SSL renewal
echo "Testing SSL certificate renewal..."
sudo certbot renew --dry-run

# Setup auto-renewal cron job
echo "Setting up auto-renewal..."
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -

echo ""
echo "✓ SSL certificate installed successfully!"
echo "✓ Auto-renewal configured"
echo ""
echo "Your service is now available at:"
echo "https://naat-ai.duckdns.org"
echo ""
echo "Certificate will auto-renew every 60 days"