#!/bin/bash

# Video Ingestion Function Deployment Script
# This script helps deploy the video ingestion function to Appwrite

set -e

echo "🚀 Deploying Video Ingestion Function to Appwrite"
echo "=================================================="
echo ""

# Check if Appwrite CLI is installed
if ! command -v appwrite &> /dev/null; then
    echo "❌ Appwrite CLI is not installed"
    echo "Please install it from: https://appwrite.io/docs/command-line"
    exit 1
fi

echo "✅ Appwrite CLI found"
echo ""

# Check if user is logged in
if ! appwrite client --version &> /dev/null; then
    echo "⚠️  You may need to login to Appwrite"
    echo "Run: appwrite login"
    echo ""
fi

# Check if appwrite.json exists
if [ ! -f "appwrite.json" ]; then
    echo "❌ appwrite.json not found"
    echo "Please ensure you're in the functions/ingest-videos directory"
    exit 1
fi

echo "📋 Configuration Check"
echo "----------------------"

# Read and display configuration
if command -v jq &> /dev/null; then
    echo "Function Name: $(jq -r '.functions[0].name' appwrite.json)"
    echo "Runtime: $(jq -r '.functions[0].runtime' appwrite.json)"
    echo "Schedule: $(jq -r '.functions[0].schedule' appwrite.json)"
    echo "Timeout: $(jq -r '.functions[0].timeout' appwrite.json)s"
else
    echo "⚠️  Install 'jq' for better configuration display"
fi

echo ""
echo "⚠️  Important: Make sure you've configured all environment variables in appwrite.json"
echo ""
echo "Required variables:"
echo "  - APPWRITE_API_KEY"
echo "  - APPWRITE_DATABASE_ID"
echo "  - APPWRITE_NAATS_COLLECTION_ID"
echo "  - YOUTUBE_CHANNEL_ID"
echo "  - YOUTUBE_API_KEY"
echo ""

read -p "Have you configured all environment variables? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    echo "Please update appwrite.json with your environment variables"
    exit 1
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🚀 Deploying function..."
appwrite deploy function

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Verify the function in your Appwrite console"
echo "  2. Check the function logs for any errors"
echo "  3. Manually trigger the function to test: appwrite functions createExecution --functionId=ingest-videos"
echo "  4. The function will run automatically based on the cron schedule"
echo ""
