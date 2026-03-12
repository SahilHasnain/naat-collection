# Live Radio Docker Container
FROM node:18-alpine

# Install FFmpeg
RUN apk add --no-cache ffmpeg nginx

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source code
COPY src/ ./src/
COPY nginx.conf /etc/nginx/nginx.conf

# Create directories for HLS output
RUN mkdir -p /var/www/html/live
RUN mkdir -p /app/audio-cache

# Expose ports
EXPOSE 80 3000

# Start script
COPY start.sh ./
RUN chmod +x start.sh

CMD ["./start.sh"]