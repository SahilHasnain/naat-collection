#!/bin/sh

# Start Icecast in background
icecast2 -c /etc/icecast2/icecast.xml &

# Start Node.js server in background
node src/server.js &

# Start FFmpeg streaming to Icecast
node src/stream-manager.js &

# Keep container alive
wait