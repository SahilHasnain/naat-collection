#!/bin/sh

# Start nginx in background
nginx &

# Start Node.js server in background
node src/server.js &

# Start FFmpeg streaming
node src/stream-manager.js &

# Keep container alive
wait