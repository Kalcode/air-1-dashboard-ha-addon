# Quick Start Guide

This guide will help you get the Air-1 Dashboard server running quickly.

## Installation

1. **Install Dependencies**

```bash
cd server
npm install
```

This will install:
- `express` ^4.18.2 - Web server framework
- `axios` ^1.6.0 - HTTP client for HA API calls
- `compression` ^1.7.4 - Gzip compression middleware

## Development Setup

### Option 1: Local Development (Mock HA)

For frontend development without a Home Assistant instance:

```bash
# Create a test config
cp example-config.json test-config.json

# Set environment variables
export CONFIG_PATH="./test-config.json"
export STATIC_PATH="../dashboard/dist"
export PORT=8099

# Start server
npm start
```

**Note:** API endpoints will fail without a real HA instance, but the server will start and serve static files.

### Option 2: Local Development (Real HA)

Connect to a real Home Assistant instance:

```bash
# Get a long-lived access token from Home Assistant:
# Settings -> Users -> Your User -> Security -> Long-Lived Access Tokens

export SUPERVISOR_TOKEN="your_long_lived_access_token_here"
export HA_API_BASE="http://homeassistant.local:8123/api"
export CONFIG_PATH="./example-config.json"
export STATIC_PATH="../dashboard/dist"
export PORT=8099

# Start server
npm start
```

### Option 3: Watch Mode (Auto-restart)

For development with automatic restart on file changes:

```bash
export SUPERVISOR_TOKEN="your_token"
export HA_API_BASE="http://homeassistant.local:8123/api"

npm run dev
```

## Testing the Server

### 1. Health Check

```bash
curl http://localhost:8099/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "config": {
    "sensor_prefix": "air1",
    "update_interval": 60,
    "history_days": 30
  }
}
```

### 2. Test API Endpoints

```bash
# Get configuration
curl http://localhost:8099/api/config

# List all sensors
curl http://localhost:8099/api/sensors

# List sensors grouped by device
curl "http://localhost:8099/api/sensors?group_by_device=true"

# Get specific sensor state (replace with your entity_id)
curl http://localhost:8099/api/sensors/sensor.air1_bedroom_pm25

# Get 7 days of history (replace with your entity_id)
curl "http://localhost:8099/api/history/sensor.air1_bedroom_pm25?days=7"
```

### 3. Run Test Script

```bash
# Make sure environment variables are set
export SUPERVISOR_TOKEN="your_token"
export HA_API_BASE="http://homeassistant.local:8123/api"

# Run tests
node test-example.js
```

This will test all server components and display results.

## Home Assistant Addon Deployment

When running as a Home Assistant addon, the server automatically:

1. **Reads configuration** from `/data/options.json`
2. **Serves static files** from `/app/dashboard/dist/`
3. **Connects to HA API** via `http://supervisor/core/api`
4. **Uses supervisor token** from `SUPERVISOR_TOKEN` env var
5. **Handles ingress paths** automatically
6. **Listens on port** specified in addon config (default: 8099)

### Environment Variables (Addon Context)

These are automatically provided by Home Assistant:

- `SUPERVISOR_TOKEN` - Authentication token for HA API
- `PORT` - Port to listen on (from addon config)

### File Paths (Addon Context)

- Configuration: `/data/options.json`
- Static files: `/app/dashboard/dist/`
- Logs: stdout/stderr (captured by HA)

## Configuration Options

Edit `/data/options.json` (in addon) or `example-config.json` (local dev):

```json
{
  "sensor_prefix": "air1",
  "update_interval": 60,
  "history_days": 30
}
```

**Options:**

- `sensor_prefix` (string): Prefix for sensor entity IDs (e.g., "air1" matches "sensor.air1_*")
- `update_interval` (integer): Update interval in seconds (10-3600)
- `history_days` (integer): Number of days of history to fetch (1-365)

## Troubleshooting

### Server won't start

**Check Node.js version:**
```bash
node --version  # Should be >= 18.0.0
```

**Check dependencies:**
```bash
npm install
```

### Cannot connect to Home Assistant

**Verify token:**
```bash
curl -H "Authorization: Bearer $SUPERVISOR_TOKEN" \
     "$HA_API_BASE/"
```

Should return: `{"message":"API running."}`

**Check HA API URL:**
- Local dev: `http://homeassistant.local:8123/api`
- Addon: `http://supervisor/core/api` (automatic)

### No sensors found

**Check sensor prefix:**
```bash
# List all sensor entities in HA
curl -H "Authorization: Bearer $SUPERVISOR_TOKEN" \
     "$HA_API_BASE/states" | grep '"entity_id":"sensor\.'
```

Make sure your sensors match the prefix pattern: `sensor.{prefix}_*`

**Verify sensor naming:**
- Expected: `sensor.air1_bedroom_pm25`
- Not: `sensor.bedroom_air1_pm25` (prefix must be first)

### API returns 500 errors

**Check server logs:**
```bash
# Look for [Server] and [HA Client] prefixed messages
```

**Common issues:**
- Invalid SUPERVISOR_TOKEN
- HA API unavailable
- Network connectivity issues
- Malformed entity_id in request

### Static files not serving

**Check STATIC_PATH:**
```bash
ls -la $STATIC_PATH
# Should contain index.html and assets/
```

**Build frontend first:**
```bash
cd ../dashboard
npm run build
```

## Production Considerations

### Logging

- All logs go to stdout/stderr
- Prefixed with `[Server]` or `[HA Client]`
- Captured by Home Assistant supervisor

### Performance

- Compression enabled by default (gzip)
- 30-second timeout on HA API calls
- No caching (HA handles state caching)

### Security

- Authentication handled by HA ingress
- No direct internet exposure
- API token secured by supervisor

### Error Handling

- All endpoints return JSON
- Consistent error format
- Graceful degradation on HA API errors
- Non-blocking startup if HA unavailable

## Next Steps

1. **Build the frontend**: See `../dashboard/README.md`
2. **Configure sensors**: Ensure ESPHome devices use correct prefix
3. **Test in Home Assistant**: Install as addon and verify functionality
4. **Customize**: Adjust configuration options as needed

## Support

For issues or questions:

1. Check server logs for error messages
2. Verify Home Assistant API connectivity
3. Ensure sensor naming follows prefix pattern
4. Review API endpoint documentation in README.md
