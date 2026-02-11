#!/bin/bash

# Development Server Script
# Makes it easy to run the server locally with environment variables

set -e

echo "=================================="
echo "Air-1 Dashboard Development Server"
echo "=================================="
echo ""

# Default values
PORT="${PORT:-8099}"
CONFIG_PATH="${CONFIG_PATH:-./example-config.json}"
STATIC_PATH="${STATIC_PATH:-../dashboard/dist}"
NODE_ENV="${NODE_ENV:-development}"

# Check if SUPERVISOR_TOKEN is set
if [ -z "$SUPERVISOR_TOKEN" ]; then
    echo "⚠️  Warning: SUPERVISOR_TOKEN not set"
    echo "   API calls to Home Assistant will fail"
    echo ""
    echo "To connect to a real HA instance:"
    echo "  export SUPERVISOR_TOKEN=\"your_token\""
    echo "  export HA_API_BASE=\"http://homeassistant.local:8123/api\""
    echo ""
fi

# Check if HA_API_BASE is set
if [ -z "$HA_API_BASE" ]; then
    echo "⚠️  Warning: HA_API_BASE not set"
    echo "   Defaulting to: http://supervisor/core/api"
    echo ""
fi

# Check if config file exists
if [ ! -f "$CONFIG_PATH" ]; then
    echo "⚠️  Warning: Config file not found: $CONFIG_PATH"
    echo "   Creating from example..."
    cp example-config.json "$CONFIG_PATH"
    echo "   ✓ Created: $CONFIG_PATH"
    echo ""
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Display configuration
echo "Configuration:"
echo "  PORT: $PORT"
echo "  CONFIG_PATH: $CONFIG_PATH"
echo "  STATIC_PATH: $STATIC_PATH"
echo "  NODE_ENV: $NODE_ENV"
echo "  HA_API_BASE: ${HA_API_BASE:-http://supervisor/core/api}"
echo "  SUPERVISOR_TOKEN: ${SUPERVISOR_TOKEN:+***set***}"
echo ""

# Export variables
export PORT
export CONFIG_PATH
export STATIC_PATH
export NODE_ENV

echo "Starting server..."
echo "=================================="
echo ""

# Run server
if [ "$1" = "--watch" ]; then
    echo "Running in watch mode (auto-restart on changes)"
    npm run dev
else
    npm start
fi
