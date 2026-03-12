#!/bin/bash

echo "🎵 Starting Live Radio Services..."

# Start Icecast in background with proper config path
echo "📡 Starting Icecast server..."
icecast -c /config/icecast.xml -b &
ICECAST_PID=$!

# Wait for Icecast to start
echo "⏳ Waiting for Icecast to initialize..."
sleep 10

# Check if Icecast is running
if curl -f http://localhost:8000/ > /dev/null 2>&1; then
    echo "✅ Icecast server started successfully"
else
    echo "❌ Icecast server failed to start"
    echo "🔍 Checking Icecast process..."
    ps aux | grep icecast
    echo "🔍 Checking port 8000..."
    netstat -tlnp | grep :8000 || echo "Port 8000 not listening"
    echo "🔍 Icecast logs:"
    tail -20 /var/log/icecast/error.log 2>/dev/null || echo "No error log found"
    exit 1
fi

# Start Node.js server in background
echo "🚀 Starting Node.js API server..."
node src/server.js &
API_PID=$!

# Wait a moment for API server to start
sleep 3

# Start FFmpeg streaming to Icecast
echo "🎶 Starting FFmpeg stream manager..."
node src/stream-manager.js &
STREAM_PID=$!

echo "✅ All services started!"
echo "🎵 Icecast PID: $ICECAST_PID"
echo "🚀 API PID: $API_PID" 
echo "🎶 Stream PID: $STREAM_PID"

# Function to handle shutdown
cleanup() {
    echo "🛑 Shutting down services..."
    kill $ICECAST_PID $API_PID $STREAM_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

# Keep container alive and wait for all processes
wait