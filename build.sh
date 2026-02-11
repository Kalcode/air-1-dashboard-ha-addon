#!/bin/bash
set -e

echo "========================================="
echo "  Air-1 Dashboard HA Addon Build Script"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Build directory
BUILD_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$BUILD_DIR"

echo "Build directory: $BUILD_DIR"
echo ""

# Step 1: Check if dashboard source exists
echo "Step 1: Checking dashboard source..."
if [ ! -f "dashboard/package.json" ]; then
    echo -e "${RED}Error: dashboard/package.json not found!${NC}"
    echo "Make sure the dashboard source has been copied from the existing app."
    exit 1
fi
echo -e "${GREEN}✓ Dashboard source found${NC}"
echo ""

# Step 2: Install dashboard dependencies
echo "Step 2: Installing dashboard dependencies..."
cd dashboard
if command -v bun &> /dev/null; then
    echo "Using Bun package manager..."
    bun install
elif command -v npm &> /dev/null; then
    echo "Using npm package manager..."
    npm install
else
    echo -e "${RED}Error: Neither bun nor npm found!${NC}"
    echo "Please install Node.js and npm or Bun to build the dashboard."
    exit 1
fi
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 3: Build the dashboard
echo "Step 3: Building dashboard..."
if command -v bun &> /dev/null; then
    bun run build
else
    npm run build
fi

if [ ! -d "dist" ]; then
    echo -e "${RED}Error: Build failed - dist directory not created${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Dashboard built successfully${NC}"
echo ""

# Step 4: Check dist size
DIST_SIZE=$(du -sh dist | cut -f1)
echo "Built dashboard size: $DIST_SIZE"
echo ""

# Step 5: Install server dependencies
echo "Step 4: Installing server dependencies..."
cd "$BUILD_DIR/server"
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: server/package.json not found!${NC}"
    exit 1
fi

# Use npm install for initial setup, npm ci requires package-lock.json
if [ -f "package-lock.json" ]; then
    npm ci --only=production
else
    echo "No package-lock.json found, using npm install..."
    npm install --production
fi
echo -e "${GREEN}✓ Server dependencies installed${NC}"
echo ""

# Step 6: Summary
cd "$BUILD_DIR"
echo "========================================="
echo -e "${GREEN}Build Complete!${NC}"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Build Docker image:"
echo "     docker build -t air1-dashboard-addon ."
echo ""
echo "  2. For local testing, copy this directory to your HA addons folder:"
echo "     cp -r . /path/to/homeassistant/addons/air1_dashboard/"
echo ""
echo "  3. Restart Home Assistant and install the addon from Supervisor"
echo ""
echo "Files ready for deployment:"
echo "  - config.yaml (addon manifest)"
echo "  - Dockerfile (container build)"
echo "  - server/ (Node.js backend)"
echo "  - dashboard/dist/ (built frontend)"
echo "  - rootfs/ (startup script)"
echo ""
