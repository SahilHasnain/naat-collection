FROM node:18-alpine

# Install Python, pip, and yt-dlp
RUN apk add --no-cache python3 py3-pip ffmpeg
RUN pip3 install yt-dlp

# Set working directory
WORKDIR /usr/local/src

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start the function
CMD ["node", "src/main.js"]