ARG BUILD_FROM=ghcr.io/hassio-addons/base:15.0.1
FROM ${BUILD_FROM}

# Install Node.js 20 LTS and jq for JSON parsing
RUN apk add --no-cache \
    nodejs \
    npm \
    jq

# Set working directory
WORKDIR /app

# Copy server application files
COPY server/ /app/server/

# Copy pre-built dashboard files
COPY dashboard/dist/ /app/dashboard/dist/

# Install production dependencies only
RUN cd /app/server && \
    npm ci --only=production && \
    npm cache clean --force

# Copy rootfs (startup scripts)
COPY rootfs/ /

# Make run script executable
RUN chmod a+x /usr/bin/run.sh

# Expose port for the web interface
EXPOSE 8099

# Set startup command
CMD ["/usr/bin/run.sh"]
