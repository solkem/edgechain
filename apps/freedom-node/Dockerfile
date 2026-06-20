# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Copy backend package files and local package dependencies
COPY packages/fl ./packages/fl
COPY packages/mars ./packages/mars
COPY apps/freedom-node/package.json apps/freedom-node/package-lock.json ./apps/freedom-node/

# Install dependencies
WORKDIR /app/apps/freedom-node
RUN npm ci

# Copy server source files
COPY apps/freedom-node/ ./

# Copy frontend build from monorepo
COPY apps/web/dist /app/apps/web/dist

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install SQLite3 and build dependencies for better-sqlite3
RUN apk add --no-cache sqlite python3 make g++

# Copy backend package files and local package dependencies
COPY packages/fl ./packages/fl
COPY packages/mars ./packages/mars
COPY apps/freedom-node/package.json apps/freedom-node/package-lock.json ./apps/freedom-node/

# Install production dependencies only
WORKDIR /app/apps/freedom-node
RUN npm ci --omit=dev

# Copy built files from builder
COPY --from=builder /app/apps/freedom-node/dist ./dist

# Copy database schema files (SQL files are not compiled by TypeScript)
COPY --from=builder /app/apps/freedom-node/src/database/schema.sql ./dist/database/schema.sql

# Copy frontend build
COPY --from=builder /app/apps/web/dist /app/apps/web/dist

# Create data directory for SQLite database
RUN mkdir -p /app/data

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/db-stats || exit 1

# Start the application
CMD ["node", "dist/index.js"]
