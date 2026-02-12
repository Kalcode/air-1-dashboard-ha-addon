#!/usr/bin/env bash
set -e

# Configuration file path
CONFIG_PATH="/data/options.json"

# Function to log messages
log_info() {
    echo "[INFO] $1"
}

log_error() {
    echo "[ERROR] $1" >&2
}

# Display startup information
log_info "Starting Air-1 Quality Dashboard addon..."
log_info "Addon version: 1.0.0"

# Check if configuration file exists
if [ ! -f "${CONFIG_PATH}" ]; then
    log_error "Configuration file not found at ${CONFIG_PATH}"
    log_info "Using default configuration values"
    SENSOR_PREFIX="air1"
    UPDATE_INTERVAL="60"
    HISTORY_DAYS="30"
else
    log_info "Reading configuration from ${CONFIG_PATH}"

    # Read configuration values with fallback to defaults
    SENSOR_PREFIX=$(jq -r '.sensor_prefix // "air1"' "${CONFIG_PATH}")
    UPDATE_INTERVAL=$(jq -r '.update_interval // 60' "${CONFIG_PATH}")
    HISTORY_DAYS=$(jq -r '.history_days // 30' "${CONFIG_PATH}")
fi

# Export environment variables for the Node.js application
export SUPERVISOR_TOKEN="${SUPERVISOR_TOKEN}"
export PORT="8099"
export SENSOR_PREFIX="${SENSOR_PREFIX}"
export UPDATE_INTERVAL="${UPDATE_INTERVAL}"
export HISTORY_DAYS="${HISTORY_DAYS}"

# Log configuration
log_info "Configuration:"
log_info "  Port: ${PORT}"
log_info "  Sensor Prefix: ${SENSOR_PREFIX}"
log_info "  Update Interval: ${UPDATE_INTERVAL} seconds"
log_info "  History Days: ${HISTORY_DAYS} days"

# Verify Node.js application exists
if [ ! -f "/app/server/server.js" ]; then
    log_error "Server application not found at /app/server/server.js"
    exit 1
fi

# Start the Node.js server
log_info "Starting Node.js server..."
exec node /app/server/server.js
