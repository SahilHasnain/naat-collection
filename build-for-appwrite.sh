#!/bin/bash
set -e

echo "Building standalone web app..."
cd apps/web

echo "Installing dependencies..."
npm install

echo "Building Next.js app..."
npm run build

echo "Copying next.config.mjs to build directory..."
cp next.config.mjs ../../next.config.mjs

echo "Build complete!"
