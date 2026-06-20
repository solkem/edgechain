# Production stage - serve pre-built static files
FROM node:20-alpine

WORKDIR /app

# Install http-server globally
RUN npm install -g http-server

# Copy pre-built dist directory
COPY dist ./dist

# Expose port
EXPOSE 8080

# Serve the app with CORS and proper routing for SPA
CMD ["http-server", "dist", "-p", "8080", "--cors", "-c-1", "--proxy", "http://localhost:8080?"]
