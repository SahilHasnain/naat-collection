# Live Radio Docker Container with Icecast
FROM node:18-alpine

# Install FFmpeg and Icecast
RUN apk add --no-cache ffmpeg icecast

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source code
COPY src/ ./src/
COPY icecast.xml /etc/icecast2/icecast.xml

# Create directories
RUN mkdir -p /app/audio-cache

# Expose ports
EXPOSE 8000 3000

# Start script
COPY start.sh ./
RUN chmod +x start.sh

CMD ["./start.sh"]