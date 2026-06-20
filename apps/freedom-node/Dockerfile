# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Copy server package files
COPY apps/freedom-node/package.json apps/freedom-node/package-lock.json ./

# Install dependencies
RUN npm ci

# Copy server source files
COPY apps/freedom-node/ ./

# Copy frontend build from monorepo
COPY apps/web/dist ./frontend-build

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install SQLite3 and build dependencies for better-sqlite3
RUN apk add --no-cache sqlite python3 make g++

# Copy server package files
COPY apps/freedom-node/package.json apps/freedom-node/package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Copy database schema files (SQL files are not compiled by TypeScript)
COPY --from=builder /app/src/database/schema.sql ./dist/database/schema.sql

# Copy frontend build
COPY --from=builder /app/frontend-build ./apps/web/dist

# Create data directory for SQLite database
RUN mkdir -p /app/data

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/db-stats || exit 1

# Start the application
CMD ["node", "dist/index.js"]
