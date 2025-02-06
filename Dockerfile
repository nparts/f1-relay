# Use Node.js LTS version
FROM node:20-slim

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript code
RUN npm run build

# Expose WebSocket and UDP ports
EXPOSE 3333/tcp
EXPOSE 20777/udp

# Start the application
CMD ["node", "dist/websocket.js"]