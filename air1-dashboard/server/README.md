# Air-1 Dashboard Server

Express.js backend server for the Air-1 Dashboard Home Assistant addon.

## Features

- **Home Assistant Integration**: Seamless integration with HA Supervisor API
- **Sensor Discovery**: Automatic discovery of air quality sensors by prefix
- **Real-time Data**: Current sensor state retrieval
- **Historical Data**: Time-series data from HA history
- **Compression**: Gzip compression for efficient data transfer
- **Ingress Support**: Handles HA ingress path prefixes
- **Error Handling**: Comprehensive error handling and logging

## Installation

```bash
cd server
npm install
```

## Configuration

The server reads configuration from `/data/options.json` (in Home Assistant addon context) or uses defaults:

```json
{
  "sensor_prefix": "air1",
  "update_interval": 60,
  "history_days": 30
}
```

### Environment Variables

- `PORT` - Server port (default: 8099)
- `SUPERVISOR_TOKEN` - Home Assistant supervisor API token (provided by HA)
- `HA_API_BASE` - Home Assistant API base URL (default: http://supervisor/core/api)
- `CONFIG_PATH` - Path to options.json (default: /data/options.json)
- `STATIC_PATH` - Path to frontend build (default: /app/dashboard/dist)
- `NODE_ENV` - Node environment (development/production)

## API Endpoints

### Health Check

```
GET /health
```

Returns server health status and configuration.

**Response:**
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

### Get Configuration

```
GET /api/config
```

Returns the current addon configuration.

**Response:**
```json
{
  "success": true,
  "data": {
    "sensor_prefix": "air1",
    "update_interval": 60,
    "history_days": 30
  }
}
```

### List All Sensors

```
GET /api/sensors
GET /api/sensors?group_by_device=true
```

Discovers all sensors matching the configured prefix.

**Query Parameters:**
- `group_by_device` - Group sensors by device/room (optional)

**Response:**
```json
{
  "success": true,
  "count": 12,
  "data": [
    {
      "entity_id": "sensor.air1_bedroom_pm25",
      "device": "bedroom",
      "device_name": "Bedroom",
      "sensor": "pm25",
      "sensor_type": "pm25",
      "value": 12.5,
      "unit": "µg/m³",
      "state": "12.5",
      "friendly_name": "Bedroom PM2.5",
      "device_class": "pm25",
      "last_updated": "2024-01-15T10:30:00.000Z",
      "last_changed": "2024-01-15T10:25:00.000Z",
      "attributes": {}
    }
  ]
}
```

**Grouped Response** (when `group_by_device=true`):
```json
{
  "success": true,
  "count": 12,
  "data": {
    "bedroom": [...sensors],
    "living_room": [...sensors]
  }
}
```

### Get Sensor State

```
GET /api/sensors/:entity_id
```

Retrieves current state for a specific sensor.

**Example:**
```
GET /api/sensors/sensor.air1_bedroom_pm25
```

**Response:**
```json
{
  "success": true,
  "data": {
    "entity_id": "sensor.air1_bedroom_pm25",
    "device": "bedroom",
    "sensor": "pm25",
    "value": 12.5,
    "unit": "µg/m³",
    "last_updated": "2024-01-15T10:30:00.000Z"
  }
}
```

### Get Historical Data

```
GET /api/history/:entity_id
GET /api/history/:entity_id?days=7
GET /api/history/:entity_id?start=2024-01-01T00:00:00.000Z&end=2024-01-15T00:00:00.000Z
```

Fetches historical time-series data for a sensor.

**Query Parameters:**
- `start` - ISO timestamp for start time (optional)
- `end` - ISO timestamp for end time (optional)
- `days` - Number of days to look back (optional, default: from config)

**Example:**
```
GET /api/history/sensor.air1_bedroom_pm25?days=7
```

**Response:**
```json
{
  "success": true,
  "data": {
    "entity_id": "sensor.air1_bedroom_pm25",
    "start": "2024-01-08T10:30:00.000Z",
    "end": "2024-01-15T10:30:00.000Z",
    "count": 168,
    "history": [
      {
        "timestamp": "2024-01-08T10:30:00.000Z",
        "value": 11.2,
        "state": "11.2",
        "attributes": {}
      }
    ]
  }
}
```

## Error Responses

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Error description",
  "message": "Detailed error message"
}
```

**HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `404` - Not Found (entity doesn't exist)
- `500` - Internal Server Error

## File Structure

```
server/
├── package.json          # Dependencies and scripts
├── server.js            # Main Express application
├── ha-client.js         # Home Assistant API client
├── config.js            # Entity mapping configuration
└── README.md            # This file
```

## Development

### Run Locally

```bash
# Set environment variables
export SUPERVISOR_TOKEN="your_token_here"
export HA_API_BASE="http://homeassistant.local:8123/api"
export CONFIG_PATH="./test-config.json"
export STATIC_PATH="../dashboard/dist"

# Start server
npm start
```

### Run with Watch Mode

```bash
npm run dev
```

### Testing API Endpoints

```bash
# Health check
curl http://localhost:8099/health

# Get configuration
curl http://localhost:8099/api/config

# List sensors
curl http://localhost:8099/api/sensors

# Get sensor state
curl http://localhost:8099/api/sensors/sensor.air1_bedroom_pm25

# Get history
curl "http://localhost:8099/api/history/sensor.air1_bedroom_pm25?days=7"
```

## Logging

The server uses console logging with prefixes for easy filtering:

- `[Server]` - Main server operations
- `[HA Client]` - Home Assistant API interactions

Example:
```
[Server] Air-1 Dashboard Server starting...
[Server] Loading configuration from /data/options.json
[Server] Testing Home Assistant API connection...
[HA Client] Testing connection to Home Assistant API
[HA Client] Connection successful: API running
[Server] Server listening on port 8099
```

## Production Deployment

The server is designed to run as a Home Assistant addon:

1. Configuration is read from `/data/options.json`
2. Static files are served from `/app/dashboard/dist/`
3. Home Assistant API is accessed via `http://supervisor/core/api`
4. Supervisor token is provided via `SUPERVISOR_TOKEN` environment variable
5. Ingress paths are automatically handled

## Entity Mapping

The server uses fuzzy matching to identify sensor types. See `config.js` for the full mapping configuration.

Supported sensor types:
- PM2.5, PM10, PM1.0, PM4.0
- CO2
- VOC (Volatile Organic Compounds)
- Temperature
- Humidity
- Pressure
- NOx (Nitrogen Oxides)
- RSSI (WiFi signal strength)

## License

MIT
