ARG BUILD_FROM=ghcr.io/hassio-addons/base:15.0.1

###############################################################################
# Stage 1: Build Dashboard (Astro + SolidJS)
###############################################################################
FROM oven/bun:1-alpine AS dashboard-builder

WORKDIR /workspace

# Copy root tsconfig (needed for dashboard tsconfig extends)
COPY tsconfig.json ./

# Copy dashboard package files
COPY dashboard/package.json dashboard/bun.lock* ./dashboard/

# Install dependencies with Bun
WORKDIR /workspace/dashboard
RUN bun install --frozen-lockfile

# Copy dashboard source
COPY dashboard/ ./

# Build the dashboard (outputs to dist/)
RUN bun run build

# Verify build output exists
RUN test -d dist || (echo "ERROR: Dashboard build failed - dist/ not found" && exit 1)

###############################################################################
# Stage 2: Install Server Dependencies
###############################################################################
FROM oven/bun:1-alpine AS server-deps

WORKDIR /build

# Copy server package files
COPY server/package.json server/bun.lock* ./

# Install production dependencies with Bun
RUN bun install --production --frozen-lockfile

###############################################################################
# Stage 3: Runtime Image
###############################################################################
FROM ${BUILD_FROM}

# Install Bun runtime with required C++ libraries
# Keep curl for Home Assistant Supervisor API communication
RUN apk add --no-cache \
    curl \
    unzip \
    libstdc++ \
    libgcc && \
    curl -fsSL https://bun.sh/install | bash && \
    ln -s /root/.bun/bin/bun /usr/local/bin/bun && \
    apk del unzip

# Set working directory
WORKDIR /app

# Copy built dashboard from stage 1
COPY --from=dashboard-builder /workspace/dashboard/dist /app/dashboard/dist

# Copy server dependencies from stage 2
COPY --from=server-deps /build/node_modules /app/server/node_modules

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
  CMD wget --no-verbose --tries=1 --spider http://localhost:8099/health || exit 1

CMD ["/usr/bin/run.sh"]
