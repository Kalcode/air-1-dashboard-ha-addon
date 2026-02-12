ARG BUILD_FROM=ghcr.io/hassio-addons/base:15.0.1

###############################################################################
# Stage 1: Build Dashboard (Astro + SolidJS)
###############################################################################
FROM node:20-alpine AS dashboard-builder

WORKDIR /build

# Copy dashboard package files
COPY dashboard/package.json dashboard/bun.lock* dashboard/package-lock.json* ./

# Install dependencies (try bun first, fallback to npm)
RUN if [ -f "bun.lock" ]; then \
      npm install -g bun && bun install; \
    else \
      npm ci || npm install; \
    fi

# Copy dashboard source
COPY dashboard/ ./

# Build the dashboard (outputs to dist/)
RUN if command -v bun > /dev/null; then \
      bun run build; \
    else \
      npm run build; \
    fi

# Verify build output exists
RUN test -d dist || (echo "ERROR: Dashboard build failed - dist/ not found" && exit 1)

###############################################################################
# Stage 2: Install Server Dependencies
###############################################################################
FROM node:20-alpine AS server-builder

WORKDIR /build

# Copy server package files
COPY server/package.json server/package-lock.json* ./

# Install production dependencies only
RUN npm ci --only=production || npm install --production

###############################################################################
# Stage 3: Runtime Image
###############################################################################
FROM ${BUILD_FROM}

# Install Node.js runtime and jq (for parsing options.json)
RUN apk add --no-cache \
    nodejs \
    npm \
    jq

# Set working directory
WORKDIR /app

# Copy built dashboard from stage 1
COPY --from=dashboard-builder /build/dist /app/dashboard/dist

# Copy server dependencies from stage 2
COPY --from=server-builder /build/node_modules /app/server/node_modules

# Copy server source code
COPY server/package.json /app/server/
COPY server/*.js /app/server/

# Copy startup script
COPY rootfs /

# Make run script executable
RUN chmod a+x /usr/bin/run.sh

# Verify critical files exist
RUN test -f /app/server/server.js || (echo "ERROR: server.js not found" && exit 1) && \
    test -d /app/dashboard/dist || (echo "ERROR: dashboard dist not found" && exit 1)

# Expose port (for internal use, ingress handles external)
EXPOSE 8099

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8099/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["/usr/bin/run.sh"]
