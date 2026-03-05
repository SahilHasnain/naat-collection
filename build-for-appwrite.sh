#!/bin/bash
set -e

echo "Installing dependencies..."
npm install

echo "Installing web app dependencies..."
cd apps/web

# Ensure node-appwrite is available locally
if [ ! -d "node_modules/node-appwrite" ]; then
  echo "node-appwrite not found locally, installing..."
  npm install node-appwrite@^21.1.0
fi

npm install

echo "Building web app..."
npm run build

echo "Copying next.config.mjs to build directory..."
cp next.config.mjs ../../next.config.mjs

echo "Build complete!"
