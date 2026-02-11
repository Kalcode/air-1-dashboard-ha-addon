#!/bin/bash
set -e

echo "🔧 Starting Air-1 Dashboard Development Preview..."
echo ""

# Check if dist exists
if [ ! -d "dashboard/dist" ]; then
    echo "❌ Dashboard not built yet!"
    echo ""
    echo "Run this first:"
    echo "  ./build.sh"
    echo ""
    exit 1
fi

# Check if server dependencies are installed
if [ ! -d "server/node_modules" ]; then
    echo "📦 Installing server dependencies..."
    cd server && npm install && cd ..
fi

echo "✅ Dashboard built"
echo "✅ Dependencies ready"
echo ""

# Start dev server
cd server && node dev-server.js
