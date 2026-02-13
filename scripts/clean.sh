#!/bin/bash
set -e

echo "🧹 Cleaning Air-1 Dashboard Addon..."
echo ""

# Get the project root (one level up from scripts/)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to remove directory/files
remove_if_exists() {
    local path=$1
    local description=$2

    if [ -e "$path" ]; then
        echo -e "${YELLOW}Removing:${NC} $description"
        rm -rf "$path"
        echo -e "${GREEN}✓ Removed${NC}"
    else
        echo -e "${GREEN}✓ Already clean:${NC} $description"
    fi
}

# Clean dashboard build artifacts
echo "Dashboard build artifacts:"
remove_if_exists "dashboard/dist" "dashboard/dist/"
remove_if_exists "dashboard/.astro" "dashboard/.astro/"
remove_if_exists "dashboard/node_modules" "dashboard/node_modules/"
echo ""

# Clean server artifacts
echo "Server artifacts:"
remove_if_exists "server/node_modules" "server/node_modules/"
echo ""

# Clean logs and temp files
echo "Logs and temporary files:"
remove_if_exists "*.log" "*.log files"
remove_if_exists ".cache" ".cache/"
remove_if_exists ".temp" ".temp/"
remove_if_exists "tasks" "tasks/"
find . -name "*.output" -type f -delete 2>/dev/null || true
echo ""

# Clean development artifacts
echo "Development artifacts:"
remove_if_exists ".DS_Store" ".DS_Store files"
find . -name ".DS_Store" -type f -delete 2>/dev/null || true
echo ""

echo "========================================="
echo -e "${GREEN}Clean Complete!${NC}"
echo "========================================="
echo ""
echo "Repository is now clean and ready for:"
echo "  • Git operations (no build artifacts)"
echo "  • Fresh deployment to HA"
echo "  • Docker builds (will build from scratch)"
echo ""
