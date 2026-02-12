#!/usr/bin/with-contenv bashio

# Display startup information
bashio::log.info "Starting Air-1 Quality Dashboard addon..."
bashio::log.info "Addon version: 1.0.0"

# Read configuration with defaults
SENSOR_PREFIX=$(bashio::config 'sensor_prefix' 'air1')
UPDATE_INTERVAL=$(bashio::config 'update_interval' '60')
HISTORY_DAYS=$(bashio::config 'history_days' '30')

# Export environment variables for the Node.js application
export SUPERVISOR_TOKEN="${SUPERVISOR_TOKEN}"
export PORT="8099"
export SENSOR_PREFIX="${SENSOR_PREFIX}"
export UPDATE_INTERVAL="${UPDATE_INTERVAL}"
export HISTORY_DAYS="${HISTORY_DAYS}"

# Log configuration
bashio::log.info "Configuration:"
bashio::log.info "  Port: ${PORT}"
bashio::log.info "  Sensor Prefix: ${SENSOR_PREFIX}"
bashio::log.info "  Update Interval: ${UPDATE_INTERVAL} seconds"
bashio::log.info "  History Days: ${HISTORY_DAYS} days"

# Verify Node.js application exists
if [ ! -f "/app/server/server.js" ]; then
    bashio::log.error "Server application not found at /app/server/server.js"
    bashio::exit.nok
fi

# Start the Node.js server
bashio::log.info "Starting Node.js server..."
exec node /app/server/server.js
