#!/bin/sh

# Start nginx in background
nginx &

# Start Node.js server in background
node src/server.js &

# Start FFmpeg streaming
node src/stream-manager.js &

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?