# Multi-stage build for SolSkins Server
# Build from src/server directory with: docker build -t dust3-server .
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
# Note: buyback.json should be in lib/solana/ before building
# Run this before building: cp ../client/lib/idl/buyback.json lib/solana/buyback.json
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install runtime dependencies only
RUN apk add --no-cache dumb-init

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files from builder stage
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json* ./

# Install production dependencies only
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Copy necessary non-compiled files
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/database/migrations ./database/migrations

# Create logs directory
RUN mkdir -p logs && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port (default 4000, configurable via env)
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]

