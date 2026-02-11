# Changelog

All notable changes to the Air-1 Quality Dashboard Home Assistant addon will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-XX-XX

### Added
- Initial release of Air-1 Quality Dashboard as a Home Assistant addon
- Automatic ESPHome sensor discovery and data fetching
- Real-time air quality monitoring with configurable polling interval
- Color-coded visualizations for all metrics (PM2.5, PM10, CO2, VOC, etc.)
- WHO air quality guidelines comparison
- Particle breakdown visualization by size
- Historical tracking and comparison features
- Multi-device support with automatic sensor discovery
- Export/import functionality for air quality data
- Share functionality with compressed URL encoding
- Home Assistant ingress panel integration
- Mobile-responsive dark theme design
- Manual entry backup mode (optional)

### Features
- Node.js Express backend for HA API integration
- SolidJS/Astro frontend for reactive UI
- Configurable sensor prefix for entity discovery
- Fuzzy matching for ESPHome entity attributes
- Graceful error handling and connection status indicators
- 30-day history retention by default
- Device grouping by room/location

### Configuration Options
- `sensor_prefix`: Entity ID prefix for sensor discovery (default: "air1")
- `update_interval`: Polling interval in seconds (default: 60)
- `history_days`: Number of days of history to retain (default: 30)

### Technical Details
- Multi-architecture support (aarch64, amd64, armhf, armv7, i386)
- Based on Home Assistant base image (ghcr.io/hassio-addons/base:15.0.1)
- Node.js 20 LTS runtime
- Minimal container footprint (~96KB frontend + ~10MB server dependencies)
- Port 8099 for ingress access

---

## Future Enhancements

Planned for future releases:

- [ ] WebSocket real-time updates (replace polling)
- [ ] Multiple device comparison view (side-by-side)
- [ ] HA automation triggers (alert when thresholds exceeded)
- [ ] MQTT direct integration (bypass HA API)
- [ ] Long-term trends and analytics (weekly/monthly reports)
- [ ] Custom threshold configuration per room
- [ ] Export to CSV or PDF reports
- [ ] Configurable notification preferences
- [ ] Integration with HA notification system
- [ ] Customizable dashboard layouts

---

[Unreleased]: https://github.com/yourusername/air1-dashboard-ha-addon/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/yourusername/air1-dashboard-ha-addon/releases/tag/v1.0.0
