#!/bin/bash
set -e

echo "Installing dependencies..."
npm install

echo "Building web app..."
cd apps/web
npm run build

echo "Copying next.config.mjs to build directory..."
cp next.config.mjs ../../next.config.mjs

echo "Build complete!"
