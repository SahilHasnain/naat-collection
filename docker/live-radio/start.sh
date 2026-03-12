#!/bin/sh

echo "🎵 Starting Live Radio Services..."

# Start Icecast in background
echo "📡 Starting Icecast server..."
icecast -c /etc/icecast.xml -b &

# Wait for Icecast to start
sleep 5

# Check if Icecast is running
if curl -f http://localhost:8000/ > /dev/null 2>&1; then
    echo "✅ Icecast server started successfully"
else
    echo "❌ Icecast server failed to start"
    exit 1
fi

# Start Node.js server in background
echo "🚀 Starting Node.js API server..."
node src/server.js &

# Start FFmpeg streaming to Icecast
echo "🎶 Starting FFmpeg stream manager..."
node src/stream-manager.js &

echo "✅ All services started!"

# Keep container alive
wait