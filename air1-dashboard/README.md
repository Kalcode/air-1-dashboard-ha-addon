# Air-1 Quality Dashboard - Home Assistant Addon

Beautiful air quality visualization dashboard for Apollo AIR-1 ESPHome sensors, integrated directly into Home Assistant.

![Version](https://img.shields.io/badge/version-0.5.0-blue)
![Home Assistant](https://img.shields.io/badge/Home%20Assistant-2023.1+-green)
![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- **Automatic Data Integration** - Automatically fetches air quality data from ESPHome sensors via Home Assistant
- **Real-time Monitoring** - Configurable polling interval (default: 60 seconds)
- **Color-Coded Visualizations** - Health-based color coding for all metrics (PM2.5, PM10, CO2, VOC, etc.)
- **WHO Guidelines** - Compare readings against WHO air quality standards
- **Particle Breakdown** - Visual breakdown of particulate matter by size
- **Historical Tracking** - View and compare past readings
- **Multi-Device Support** - Automatically discovers all Apollo AIR-1 sensors
- **Mobile-Friendly** - Responsive design optimized for all screen sizes
- **Dark Theme** - Beautiful dark theme that matches Home Assistant
- **Export/Import** - Download and share air quality data
- **Ingress Panel** - Accessible directly from Home Assistant sidebar

## Supported Sensors

This addon works with Apollo AIR-1 air quality sensors running ESPHome. It monitors:

- **Particulate Matter**: PM1.0, PM2.5, PM4.0, PM10
- **Gases**: CO2, VOC (Volatile Organic Compounds), NOx
- **Environmental**: Temperature, Humidity, Pressure
- **Device Status**: WiFi signal strength (RSSI), Uptime

## Installation

### Option 1: Local Installation (Development)

1. Clone or copy this repository to your Home Assistant addons directory:
   ```bash
   cd /addons
   git clone https://github.com/yourusername/air1-dashboard-ha-addon.git air1_dashboard
   ```

2. Build the dashboard:
   ```bash
   cd air1_dashboard
   ./scripts/build.sh
   ```

3. Refresh the add-on store in Home Assistant
4. Install "Air-1 Quality Dashboard" from the Local add-ons section

### Option 2: Add-on Repository (Production)

1. In Home Assistant, navigate to **Supervisor** → **Add-on Store**
2. Click the **⋮** menu (top right) → **Repositories**
3. Add this repository URL: `https://github.com/yourusername/air1-dashboard-ha-addon`
4. Find "Air-1 Quality Dashboard" in the add-on store
5. Click **Install**

## Configuration

After installation, configure the addon before starting:

```yaml
sensor_prefix: "air1"
update_interval: 60
history_days: 30
```

### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `sensor_prefix` | Entity ID prefix to discover sensors (e.g., `sensor.air1_*`) | `air1` |
| `update_interval` | How often to poll sensors (seconds) | `60` |
| `history_days` | Number of days of history to load | `30` |

## Usage

1. **Start the addon** from the Supervisor page
2. **Open the dashboard** from the Home Assistant sidebar (look for the "Air Quality" panel)
3. **Select your sensor** if you have multiple Apollo AIR-1 devices
4. **View real-time data** - The dashboard automatically updates every 60 seconds (or your configured interval)

### Understanding the Dashboard

#### Main Metrics Display
- **PM2.5 & PM10**: Particulate matter levels with EPA scale colors
- **CO2**: Indoor air quality indicator
- **VOC**: Volatile organic compound levels with quality badge
- **Temperature & Humidity**: Environmental comfort metrics

#### WHO Guidelines Section
- Compares your readings against WHO annual and daily limits
- Shows percentage above/below recommended levels
- Provides context for air quality assessment

#### Particle Breakdown
- Visual distribution of particle sizes
- Helps identify pollution sources (combustion, dust, cooking)

#### History & Compare
- View past readings
- Compare two readings to see changes over time
- Export data for external analysis

## ESPHome Configuration

Ensure your Apollo AIR-1 sensors are configured in ESPHome with the correct prefix. Example configuration:

```yaml
sensor:
  - platform: pmsx003
    type: PMS5003ST
    pm_2_5:
      name: "${device_name} PM2.5"
      id: pm25
    pm_10_0:
      name: "${device_name} PM10"
      id: pm10
    # ... other sensors

  - platform: scd4x
    co2:
      name: "${device_name} CO2"
      id: co2
    temperature:
      name: "${device_name} Temperature"
      id: temp
    humidity:
      name: "${device_name} Humidity"
      id: humidity
```

The addon will automatically discover entities matching `sensor.{prefix}_*`.

## Troubleshooting

### No sensors found
- Check that your ESPHome devices are online and integrated with Home Assistant
- Verify the `sensor_prefix` in addon configuration matches your entity IDs
- Example: If your entities are `sensor.bedroom_air1_pm25`, set prefix to `bedroom_air1`

### Data not updating
- Check addon logs: Supervisor → Air-1 Quality Dashboard → Logs
- Verify Home Assistant API is accessible
- Ensure entities are not unavailable or unknown
- Try restarting the addon

### Ingress not working
- Ensure `ingress: true` is set in config.yaml
- Check Home Assistant version (requires 2023.1+)
- Try accessing directly: `http://homeassistant.local:8099`

### Build errors
- Ensure Bun >= 1.0.0 is installed ([install Bun](https://bun.sh))
- Run `./scripts/build.sh` to see detailed error messages
- Check dashboard/package.json dependencies

## Development

See [DEVELOPMENT.md](DEVELOPMENT.md) for comprehensive development documentation and [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

### Quick Start

```bash
# Install dependencies (requires Bun >= 1.0.0)
bun install

# Start development (mock server + dashboard with hot reload)
bun dev
# → Dashboard: http://localhost:4321 (auto-opens)
# → Mock API: http://localhost:8099

# Build for production
bun run build

# Run type checking
bun run typecheck

# Run linter
bun run lint
```

### Building Locally

```bash
# Clean and build dashboard
./scripts/clean.sh
./scripts/build.sh

# Test Docker build
./scripts/test-docker.sh

# Deploy to HA via SMB (requires mounted addons share)
./scripts/deploy-local.sh
```

### Project Structure

```
air1-dashboard-ha-addon/
├── config.yaml              # HA addon manifest
├── Dockerfile               # Multi-stage production build
├── README.md                # This file
├── DEVELOPMENT.md           # Development guide
├── CONTRIBUTING.md          # Contribution guidelines
├── CHANGELOG.md             # Version history
├── scripts/                 # Build and deployment scripts
│   ├── build.sh             # Build dashboard
│   ├── clean.sh             # Clean artifacts
│   ├── deploy-local.sh      # Deploy to HA via SMB
│   └── test-docker.sh       # Test Docker build
├── rootfs/
│   └── usr/bin/run.sh       # Startup script
├── server/                  # TypeScript backend (Express)
│   ├── server.ts            # Main API server
│   ├── dev-server.ts        # Mock server for development
│   ├── ha-client.ts         # Home Assistant API client
│   ├── storage-routes.ts    # Persistent storage API
│   ├── db.ts                # SQLite database wrapper
│   ├── config.ts            # Entity mapping utilities
│   ├── types.ts             # Shared TypeScript types
│   └── package.json
└── dashboard/               # Frontend (Astro + SolidJS)
    ├── src/
    │   ├── components/      # UI components (TSX)
    │   ├── pages/           # Astro pages
    │   └── config.ts        # API base URL config
    ├── dist/                # Built static files
    └── package.json
```

### API Endpoints

The addon server provides these API endpoints:

**Sensor Data:**
- `GET /api/config` - Get addon configuration
- `GET /api/sensors` - Discover available air quality sensors
- `GET /api/history/:device_id?days=30` - Fetch historical data

**Storage (Persistent Snapshots):**
- `GET /api/storage/readings` - Get all saved readings (with pagination)
- `POST /api/storage/readings` - Save a new reading
- `DELETE /api/storage/readings/:id` - Delete a reading
- `DELETE /api/storage/readings` - Clear all readings
- `GET /api/storage/export` - Export all readings as JSON
- `POST /api/storage/import` - Import readings from JSON
- `GET /api/storage/stats` - Get storage statistics

## License

MIT License - See LICENSE.md for details

## Credits

- Built with [SolidJS](https://www.solidjs.com/) and [Astro](https://astro.build/)
- Designed for [Apollo AIR-1](https://apolloautomation.com/products/air-1) air quality sensors
- Integrated with [ESPHome](https://esphome.io/) and [Home Assistant](https://www.home-assistant.io/)

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/air1-dashboard-ha-addon/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/air1-dashboard-ha-addon/discussions)
- **Home Assistant Community**: [Forum Thread](https://community.home-assistant.io/)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.

---

Made with ❤️ for the Home Assistant community
