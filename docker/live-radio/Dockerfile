# Use Node.js Alpine as base and install Icecast directly
FROM node:18-alpine

# Install Icecast, FFmpeg, curl and other dependencies
RUN apk add --no-cache \
    icecast \
    ffmpeg \
    curl \
    bash

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source code
COPY src/ ./src/

# Create directories with proper permissions for nobody user
RUN mkdir -p \
    /app/audio-cache \
    /var/log/icecast \
    /config \
    /usr/share/icecast/web \
    /usr/share/icecast/admin \
    /tmp \
    && chown -R nobody:nobody /var/log/icecast /config /app \
    && chmod -R 755 /var/log/icecast /config /usr/share/icecast

# Copy and set up Icecast configuration
COPY icecast.xml /config/icecast.xml
RUN chown nobody:nobody /config/icecast.xml && chmod 644 /config/icecast.xml

# Expose ports
EXPOSE 8000 3000

# Start script
COPY start.sh ./
RUN chmod +x start.sh

CMD ["./start.sh"]