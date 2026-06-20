# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install native build dependencies used by npm packages during install
RUN apk add --no-cache python3 make g++

# Copy backend package files and local package dependencies
COPY packages/fl ./packages/fl
COPY packages/mars ./packages/mars
COPY apps/freedom-node/package.json apps/freedom-node/package-lock.json ./apps/freedom-node/

# Install dependencies
WORKDIR /app/apps/freedom-node
RUN npm ci

# Build local package dependencies so backend TypeScript can resolve their
# package "types" entries during the isolated Docker build.
RUN npx tsc --project /app/packages/fl/tsconfig.json \
  && npx tsc --project /app/packages/mars/tsconfig.json

# Copy server source files
COPY apps/freedom-node/ ./

# Copy frontend build from monorepo
COPY apps/web/dist /app/apps/web/dist

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy backend package files and local package dependencies
COPY packages/fl ./packages/fl
COPY packages/mars ./packages/mars
COPY apps/freedom-node/package.json apps/freedom-node/package-lock.json ./apps/freedom-node/

# Install production dependencies only
WORKDIR /app/apps/freedom-node
RUN npm ci --omit=dev

# Copy built files from builder
COPY --from=builder /app/apps/freedom-node/dist ./dist
COPY --from=builder /app/packages/fl/dist /app/packages/fl/dist
COPY --from=builder /app/packages/mars/dist /app/packages/mars/dist

# Copy database schema files (SQL files are not compiled by TypeScript)
COPY --from=builder /app/apps/freedom-node/src/database/schema.sql ./dist/database/schema.sql

# Copy frontend build
COPY --from=builder /app/apps/web/dist /app/apps/web/dist

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/db-stats || exit 1

# Start the application
CMD ["node", "dist/index.js"]
