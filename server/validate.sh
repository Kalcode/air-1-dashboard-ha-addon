#!/bin/bash

# Validation Script
# Checks that all server files are present and valid

set -e

echo "======================================"
echo "Air-1 Dashboard Server - Validation"
echo "======================================"
echo ""

ERRORS=0

# Check Node.js version
echo "Checking Node.js version..."
NODE_VERSION=$(node --version 2>/dev/null || echo "not installed")
if [[ $NODE_VERSION == v* ]]; then
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$MAJOR_VERSION" -ge 18 ]; then
        echo "  ✓ Node.js $NODE_VERSION (>= 18 required)"
    else
        echo "  ✗ Node.js $NODE_VERSION is too old (>= 18 required)"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "  ✗ Node.js not installed"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check required files
echo "Checking required files..."
REQUIRED_FILES=(
    "package.json"
    "server.js"
    "ha-client.js"
    "config.js"
    "README.md"
    "QUICKSTART.md"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✓ $file"
    else
        echo "  ✗ $file (missing)"
        ERRORS=$((ERRORS + 1))
    fi
done
echo ""

# Validate package.json
echo "Validating package.json..."
if [ -f "package.json" ]; then
    if node -e "JSON.parse(require('fs').readFileSync('package.json'))" 2>/dev/null; then
        echo "  ✓ Valid JSON"
    else
        echo "  ✗ Invalid JSON"
        ERRORS=$((ERRORS + 1))
    fi

    if grep -q '"type": "module"' package.json; then
        echo "  ✓ ES modules enabled"
    else
        echo "  ✗ ES modules not enabled"
        ERRORS=$((ERRORS + 1))
    fi

    if grep -q '"express"' package.json; then
        echo "  ✓ Express dependency"
    else
        echo "  ✗ Express dependency missing"
        ERRORS=$((ERRORS + 1))
    fi

    if grep -q '"axios"' package.json; then
        echo "  ✓ Axios dependency"
    else
        echo "  ✗ Axios dependency missing"
        ERRORS=$((ERRORS + 1))
    fi

    if grep -q '"compression"' package.json; then
        echo "  ✓ Compression dependency"
    else
        echo "  ✗ Compression dependency missing"
        ERRORS=$((ERRORS + 1))
    fi
fi
echo ""

# Check JavaScript syntax
echo "Checking JavaScript syntax..."
JS_FILES=("server.js" "ha-client.js" "config.js")

for file in "${JS_FILES[@]}"; do
    if [ -f "$file" ]; then
        if node --check "$file" 2>/dev/null; then
            echo "  ✓ $file syntax valid"
        else
            echo "  ✗ $file syntax error"
            ERRORS=$((ERRORS + 1))
        fi
    fi
done
echo ""

# Check exports
echo "Checking module exports..."

if [ -f "server.js" ]; then
    if grep -q "export {" server.js; then
        echo "  ✓ server.js has exports"
    else
        echo "  ✗ server.js missing exports"
        ERRORS=$((ERRORS + 1))
    fi
fi

if [ -f "ha-client.js" ]; then
    if grep -q "export async function fetchSensors" ha-client.js; then
        echo "  ✓ ha-client.js has fetchSensors"
    else
        echo "  ✗ ha-client.js missing fetchSensors"
        ERRORS=$((ERRORS + 1))
    fi

    if grep -q "export async function fetchState" ha-client.js; then
        echo "  ✓ ha-client.js has fetchState"
    else
        echo "  ✗ ha-client.js missing fetchState"
        ERRORS=$((ERRORS + 1))
    fi

    if grep -q "export async function fetchHistory" ha-client.js; then
        echo "  ✓ ha-client.js has fetchHistory"
    else
        echo "  ✗ ha-client.js missing fetchHistory"
        ERRORS=$((ERRORS + 1))
    fi

    if grep -q "export function transformEntityToSensorData" ha-client.js; then
        echo "  ✓ ha-client.js has transformEntityToSensorData"
    else
        echo "  ✗ ha-client.js missing transformEntityToSensorData"
        ERRORS=$((ERRORS + 1))
    fi
fi

if [ -f "config.js" ]; then
    if grep -q "export const ENTITY_MAPPINGS" config.js; then
        echo "  ✓ config.js has ENTITY_MAPPINGS"
    else
        echo "  ✗ config.js missing ENTITY_MAPPINGS"
        ERRORS=$((ERRORS + 1))
    fi

    if grep -q "export function parseEntityId" config.js; then
        echo "  ✓ config.js has parseEntityId"
    else
        echo "  ✗ config.js missing parseEntityId"
        ERRORS=$((ERRORS + 1))
    fi

    if grep -q "export function groupEntitiesByDevice" config.js; then
        echo "  ✓ config.js has groupEntitiesByDevice"
    else
        echo "  ✗ config.js missing groupEntitiesByDevice"
        ERRORS=$((ERRORS + 1))
    fi
fi
echo ""

# Check dependencies
echo "Checking dependencies..."
if [ -d "node_modules" ]; then
    echo "  ✓ node_modules exists"

    if [ -d "node_modules/express" ]; then
        echo "  ✓ express installed"
    else
        echo "  ⚠ express not installed (run: npm install)"
    fi

    if [ -d "node_modules/axios" ]; then
        echo "  ✓ axios installed"
    else
        echo "  ⚠ axios not installed (run: npm install)"
    fi

    if [ -d "node_modules/compression" ]; then
        echo "  ✓ compression installed"
    else
        echo "  ⚠ compression not installed (run: npm install)"
    fi
else
    echo "  ⚠ node_modules not found (run: npm install)"
fi
echo ""

# Summary
echo "======================================"
if [ $ERRORS -eq 0 ]; then
    echo "✅ All validation checks passed!"
    echo "======================================"
    echo ""
    echo "Next steps:"
    echo "  1. Run: npm install"
    echo "  2. Set environment variables:"
    echo "     export SUPERVISOR_TOKEN=\"your_token\""
    echo "     export HA_API_BASE=\"http://homeassistant.local:8123/api\""
    echo "  3. Start server: npm start"
    echo ""
    exit 0
else
    echo "❌ Validation failed with $ERRORS error(s)"
    echo "======================================"
    echo ""
    echo "Please fix the errors above and try again."
    echo ""
    exit 1
fi
