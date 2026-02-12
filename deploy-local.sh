#!/bin/bash
set -e

echo "🚀 Deploying Air-1 Dashboard to Home Assistant..."
echo ""

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
SMB_PATH="/Volumes/addons"
ADDON_NAME="air1_dashboard"
TARGET_PATH="$SMB_PATH/$ADDON_NAME"

# Step 1: Clean build artifacts
echo "Step 1: Cleaning build artifacts..."
./clean.sh
echo ""

# Step 2: Check if SMB share is mounted
echo "Step 2: Checking SMB connection..."
if [ ! -d "$SMB_PATH" ]; then
    echo -e "${RED}Error: SMB share not mounted at $SMB_PATH${NC}"
    echo ""
    echo "To mount the share:"
    echo "  1. Open Finder"
    echo "  2. Press Cmd+K"
    echo "  3. Enter: smb://homeassistant/addons"
    echo "  4. Click Connect"
    echo ""
    echo "Or run this command:"
    echo "  open 'smb://homeassistant/addons'"
    echo ""
    exit 1
fi
echo -e "${GREEN}✓ SMB share mounted${NC}"
echo ""

# Step 3: Remove old addon directory
echo "Step 3: Removing old addon (if exists)..."
if [ -d "$TARGET_PATH" ]; then
    echo "Removing $TARGET_PATH..."
    rm -rf "$TARGET_PATH"
    echo -e "${GREEN}✓ Old version removed${NC}"
else
    echo -e "${GREEN}✓ No previous version found${NC}"
fi
echo ""

# Step 4: Create target directory
echo "Step 4: Creating addon directory..."
mkdir -p "$TARGET_PATH"
echo -e "${GREEN}✓ Directory created${NC}"
echo ""

# Step 5: Copy addon files (excluding build artifacts and git)
echo "Step 5: Copying addon files..."
rsync -av \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='.astro' \
    --exclude='.git' \
    --exclude='.DS_Store' \
    --exclude='*.log' \
    --exclude='.cache' \
    --exclude='.temp' \
    --exclude='tasks' \
    --exclude='*.output' \
    --exclude='.wrangler' \
    --exclude='.vscode' \
    --exclude='.idea' \
    . "$TARGET_PATH/"

echo -e "${GREEN}✓ Files copied${NC}"
echo ""

# Step 6: Show summary
echo "========================================="
echo -e "${GREEN}Deployment Complete!${NC}"
echo "========================================="
echo ""
echo "Addon deployed to: $TARGET_PATH"
echo ""
echo "Next steps in Home Assistant:"
echo "  1. Go to: Settings → Add-ons → ⋮ (menu)"
echo "  2. Click: 'Check for updates'"
echo "  3. Find: 'Air-1 Quality Dashboard' in Local add-ons"
echo "  4. Click: 'Install' or 'Rebuild' if already installed"
echo ""
echo "Files deployed:"
ls -lh "$TARGET_PATH" | tail -n +2 | wc -l | xargs echo "  Total files/folders:"
du -sh "$TARGET_PATH" | awk '{print "  Total size: " $1}'
echo ""
echo "⚠️  Remember: Home Assistant will build the Docker image"
echo "    This may take a few minutes on first install."
echo ""
