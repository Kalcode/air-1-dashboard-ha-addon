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

# Step 2: Install all workspace dependencies
echo "Step 2: Installing workspace dependencies..."
if ! command -v bun &> /dev/null; then
    echo -e "${RED}Error: Bun not found!${NC}"
    echo "This project requires Bun. Install from: https://bun.sh"
    exit 1
fi

echo "Using Bun workspace..."
bun install
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 3: Build the dashboard
echo "Step 3: Building dashboard..."
cd dashboard
bun run build

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

# Step 4: Verify server exists
echo "Step 4: Verifying server..."
cd "$BUILD_DIR"
if [ ! -f "server/package.json" ]; then
    echo -e "${RED}Error: server/package.json not found!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Server verified (dependencies installed via workspace)${NC}"
echo ""

# Step 5: Summary
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
