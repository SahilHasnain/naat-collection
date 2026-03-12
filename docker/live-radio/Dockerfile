# Use Node.js Alpine as base and install Icecast directly
FROM node:18-alpine

# Install Icecast, FFmpeg, curl and other dependencies
RUN apk add --no-cache \
    icecast \
    ffmpeg \
    curl \
    bash \
    shadow

# Create icecast user and group
RUN addgroup -g 1000 icecast && \
    adduser -D -s /bin/bash -u 1000 -G icecast icecast

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source code
COPY src/ ./src/

# Create directories with proper permissions
RUN mkdir -p \
    /app/audio-cache \
    /var/log/icecast \
    /config \
    /usr/share/icecast/web \
    /usr/share/icecast/admin \
    /tmp/icecast \
    && chown -R icecast:icecast /var/log/icecast /config /usr/share/icecast /tmp/icecast /app \
    && chmod -R 755 /var/log/icecast /config /usr/share/icecast

# Copy and set up Icecast configuration
COPY icecast.xml /config/icecast.xml
RUN chown icecast:icecast /config/icecast.xml && chmod 644 /config/icecast.xml

# Expose ports
EXPOSE 8000 3000

# Start script
COPY start.sh ./
RUN chmod +x start.sh

CMD ["./start.sh"]