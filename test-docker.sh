#!/bin/bash
set -e

echo "🐳 Testing Air-1 Dashboard Docker Container Locally"
echo ""

# Build the image
echo "Step 1: Building Docker image..."
docker build -t air1-test .

echo ""
echo "Step 2: Checking dist contents..."
docker run --rm --entrypoint ls air1-test -laR /app/dashboard/dist | head -50

echo ""
echo "Step 3: Starting container..."
echo "Container will run on http://localhost:8099"
echo "Press Ctrl+C to stop"
echo ""

# Run with mock env vars
docker run -it --rm \
  -p 8099:8099 \
  -e SUPERVISOR_TOKEN="test_token_local" \
  -e SENSOR_PREFIX="apollo_air_1" \
  -e UPDATE_INTERVAL="60" \
  -e HISTORY_DAYS="30" \
  --name air1-test-container \
  air1-test
