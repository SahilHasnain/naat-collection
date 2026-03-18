# Deployment Instructions for DigitalOcean

## On Your Droplet

### 1. Clone Repository
```bash
cd ~
git clone https://github.com/yourusername/naat-collection.git
cd naat-collection/apps/ai-service
```

### 2. Run Deployment Script
```bash
chmod +x deploy.sh
./deploy.sh
```

### 3. Setup SSL Certificate
Run SSL setup:
```bash
chmod +x setup-ssl.sh
./setup-ssl.sh
```

### 4. Verify
```bash
curl https://naat-ai.duckdns.org/health
```

## Update Your Next.js App

Add to `.env.local`:
```
AI_SERVICE_URL=https://naat-ai.duckdns.org
```

## Maintenance Commands

```bash
# View logs
docker-compose logs -f

# Restart service
docker-compose restart

# Update service
git pull && docker-compose up -d --build

# Check nginx status
sudo systemctl status nginx

# View nginx logs
sudo tail -f /var/log/nginx/naat-ai-error.log
```