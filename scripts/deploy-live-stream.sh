#!/bin/bash

# Deploy Live Stream Functions
# Usage: ./scripts/deploy-live-stream.sh

set -e

echo "🚀 Deploying HLS Live Stream Functions"
echo "======================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Build streaming generator
echo -e "\n${BLUE}Building live-stream-generator...${NC}"
cd functions/live-stream-generator
npm install
npm run build
echo -e "${GREEN}✓ Built live-stream-generator${NC}"

# Build metadata API
echo -e "\n${BLUE}Building live-stream-metadata...${NC}"
cd ../live-stream-metadata
npm install
npm run build
echo -e "${GREEN}✓ Built live-stream-metadata${NC}"

# Build health check
echo -e "\n${BLUE}Building live-stream-health...${NC}"
cd ../live-stream-health
npm install
npm run build
echo -e "${GREEN}✓ Built live-stream-health${NC}"

cd ../..

echo -e "\n${GREEN}✓ All functions built successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Deploy functions via Appwrite Console or CLI"
echo "2. Create 'live-stream' storage bucket"
echo "3. Set environment variables in function settings"
echo "4. Trigger live-stream-generator to start stream"
echo ""
echo "See HLS_STREAMING_DEPLOYMENT.md for detailed instructions"
