FROM node:25.2.1-alpine

WORKDIR /usr/src/app

# Install production dependencies
COPY package*.json ./
RUN npm ci --production

# Copy application source
COPY . .

# Database path (bind-mount ./data to /data in docker-compose)
ENV DATABASE_PATH=/data/network.db

EXPOSE 3001

# Use node for production run
CMD ["node", "index.js"]
