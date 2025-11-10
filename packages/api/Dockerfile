FROM node:20-alpine

WORKDIR /app

# Copy deployment package file
COPY package-deploy.json ./package.json

# Install dependencies
RUN npm install --omit=dev

# Copy server file
COPY aggregation-server.js ./

# Expose port
EXPOSE 3001

# Start server
CMD ["node", "aggregation-server.js"]
