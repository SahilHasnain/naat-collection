# Live Radio Docker Container with Icecast
FROM node:18-alpine

# Install FFmpeg and Icecast
RUN apk add --no-cache ffmpeg icecast curl

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source code and config
COPY src/ ./src/
COPY icecast.xml /etc/icecast.xml

# Create directories and set permissions
RUN mkdir -p /app/audio-cache /var/log/icecast /tmp
RUN chmod 755 /var/log/icecast

# Expose ports
EXPOSE 8000 3000

# Start script
COPY start.sh ./
RUN chmod +x start.sh

CMD ["./start.sh"]