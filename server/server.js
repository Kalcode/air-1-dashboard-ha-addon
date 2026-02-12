/**
 * Air-1 Dashboard Server
 *
 * Express server for Home Assistant addon that provides API endpoints
 * for air quality sensor data and serves the dashboard frontend.
 */

import express from 'express';
import compression from 'compression';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  fetchSensors,
  fetchState,
  fetchHistory,
  transformEntityToSensorData,
  transformHistoryData,
  testConnection
} from './ha-client.js';
import { groupEntitiesByDevice } from './config.js';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const PORT = process.env.PORT || 8099;
const CONFIG_PATH = process.env.CONFIG_PATH || '/data/options.json';
const STATIC_PATH = process.env.STATIC_PATH || '/app/dashboard/dist';

// Default configuration
const DEFAULT_CONFIG = {
  sensor_prefix: 'apollo_air_1',
  update_interval: 10,
  history_days: 30
};

let appConfig = { ...DEFAULT_CONFIG };

/**
 * Load configuration from file
 */
async function loadConfig() {
  try {
    console.log(`[Server] Loading configuration from ${CONFIG_PATH}`);
    const configData = await readFile(CONFIG_PATH, 'utf8');
    const parsedConfig = JSON.parse(configData);

    appConfig = {
      ...DEFAULT_CONFIG,
      ...parsedConfig
    };

    console.log('[Server] Configuration loaded:', appConfig);
  } catch (error) {
    console.warn(`[Server] Could not load config file: ${error.message}`);
    console.log('[Server] Using default configuration:', DEFAULT_CONFIG);
    appConfig = { ...DEFAULT_CONFIG };
  }
}

/**
 * Create Express application
 */
function createApp() {
  const app = express();

  // Middleware
  app.use(compression()); // Enable gzip compression
  app.use(express.json()); // Parse JSON request bodies

  // Request logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[Server] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    });
    next();
  });

  // Normalize paths - remove leading double slashes from ingress
  app.use((req, res, next) => {
    if (req.path.startsWith('//')) {
      req.url = req.url.replace(/^\/+/, '/');
    }
    next();
  });

  // Log all incoming requests for debugging
  app.use((req, res, next) => {
    const ingressPath = req.headers['x-ingress-path'];
    console.log(`[Server] ${req.method} ${req.path} | Ingress: ${ingressPath || 'NOT SET'}`);
    next();
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      config: {
        sensor_prefix: appConfig.sensor_prefix,
        update_interval: appConfig.update_interval,
        history_days: appConfig.history_days
      }
    });
  });

  // API Routes

  /**
   * GET /api/config
   * Returns the current addon configuration
   */
  app.get('/api/config', (req, res) => {
    try {
      res.json({
        success: true,
        data: appConfig
      });
    } catch (error) {
      console.error('[Server] Error in /api/config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve configuration',
        message: error.message
      });
    }
  });

  /**
   * GET /api/sensors
   * Discover and return all air quality entities matching the configured prefix
   */
  app.get('/api/sensors', async (req, res) => {
    try {
      console.log(`[Server] Fetching sensors with prefix: ${appConfig.sensor_prefix}`);

      const entities = await fetchSensors(appConfig.sensor_prefix);

      if (entities.length === 0) {
        return res.json({
          success: true,
          devices: [],
          message: `No sensors found with prefix "${appConfig.sensor_prefix}"`
        });
      }

      // Group entities by device
      const grouped = groupEntitiesByDevice(entities, appConfig.sensor_prefix);

      // Transform each device's entities into a device object
      const devices = Object.entries(grouped).map(([deviceId, deviceEntities]) => {
        console.log(`\n[Server] Processing device: ${deviceId}`);
        console.log(`[Server] Raw entities for ${deviceId}:`, deviceEntities.map(e => ({
          entity_id: e.entity_id,
          state: e.state,
          unit: e.unit_of_measurement
        })));

        // Get device metadata from first entity
        const firstEntity = deviceEntities[0];
        const deviceName = firstEntity.device_name || deviceId;

        // Transform entities to sensor data array
        const sensorDataArray = transformEntityToSensorData(deviceEntities, appConfig.sensor_prefix);
        console.log(`[Server] Transformed sensor data for ${deviceId}:`, sensorDataArray);

        // Combine all sensor readings into a single device object
        const combinedSensorData = {};
        for (const sensor of sensorDataArray) {
          if (sensor.sensor_type && sensor.value !== null) {
            // Map sensor_type to the property name expected by the dashboard
            combinedSensorData[sensor.sensor_type] = sensor.value;
          }
        }
        console.log(`[Server] Combined sensor data for ${deviceId}:`, combinedSensorData);

        return {
          entity_id: deviceId,
          device_id: deviceId,
          device_name: deviceName,
          friendly_name: `Apollo AIR-1 ${deviceName}`,
          room: null, // Could extract from entity names if needed
          ...combinedSensorData // Merge all sensor readings (co2, pm25, temperature, etc.)
        };
      });

      console.log(`[Server] Discovered ${devices.length} device(s) with ${entities.length} sensor entities`);

      res.json({
        success: true,
        devices: devices,
        count: devices.length
      });
    } catch (error) {
      console.error('[Server] Error in /api/sensors:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch sensors',
        message: error.message
      });
    }
  });

  /**
   * GET /api/sensors/:entity_id
   * Get current state for a specific sensor entity
   */
  app.get('/api/sensors/:entity_id', async (req, res) => {
    try {
      const { entity_id } = req.params;

      console.log(`[Server] Fetching state for entity: ${entity_id}`);

      // Validate entity_id format
      if (!entity_id || !entity_id.includes('.')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid entity_id format'
        });
      }

      const state = await fetchState(entity_id);

      // Transform to sensor data format
      const sensorData = transformEntityToSensorData([state], appConfig.sensor_prefix)[0];

      res.json({
        success: true,
        data: sensorData
      });
    } catch (error) {
      console.error(`[Server] Error in /api/sensors/${req.params.entity_id}:`, error);

      const statusCode = error.message.includes('not found') ? 404 : 500;

      res.status(statusCode).json({
        success: false,
        error: 'Failed to fetch sensor state',
        message: error.message
      });
    }
  });

  /**
   * GET /api/history/:entity_id
   * Fetch historical data for a sensor entity
   * Query params:
   *   - start: ISO timestamp (optional)
   *   - end: ISO timestamp (optional)
   *   - days: Number of days to look back (optional, default: from config)
   */
  app.get('/api/history/:entity_id', async (req, res) => {
    try {
      const { entity_id } = req.params;
      let { start, end, days } = req.query;

      // Validate entity_id format
      if (!entity_id || !entity_id.includes('.')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid entity_id format'
        });
      }

      // Calculate time range
      if (!start && days) {
        const daysNum = parseInt(days, 10);
        if (isNaN(daysNum) || daysNum < 1) {
          return res.status(400).json({
            success: false,
            error: 'Invalid days parameter'
          });
        }
        start = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000).toISOString();
      } else if (!start) {
        // Use configured history_days as default
        start = new Date(
          Date.now() - appConfig.history_days * 24 * 60 * 60 * 1000
        ).toISOString();
      }

      if (!end) {
        end = new Date().toISOString();
      }

      console.log(`[Server] Fetching history for ${entity_id} from ${start} to ${end}`);

      const historyData = await fetchHistory(entity_id, start, end);

      // Transform history data to time-series format
      const transformedData = transformHistoryData(historyData);

      res.json({
        success: true,
        data: {
          entity_id: entity_id,
          start: start,
          end: end,
          count: transformedData.length,
          history: transformedData
        }
      });
    } catch (error) {
      console.error(`[Server] Error in /api/history/${req.params.entity_id}:`, error);

      res.status(500).json({
        success: false,
        error: 'Failed to fetch history data',
        message: error.message
      });
    }
  });

  // Serve static files from dashboard build directory
  // HA ingress proxy handles path forwarding, so we just serve files as-is
  app.use(express.static(STATIC_PATH));

  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    // Normalize path to handle double slashes from ingress
    const normalizedPath = req.path.replace(/^\/+/, '/');

    // Skip API routes
    if (normalizedPath.startsWith('/api/')) {
      return res.status(404).json({
        success: false,
        error: 'API endpoint not found'
      });
    }

    // Serve index.html for SPA routing
    // HA ingress proxy handles path forwarding
    res.sendFile(join(STATIC_PATH, 'index.html'), (err) => {
      if (err) {
        console.error('[Server] Error serving index.html:', err);
        res.status(500).json({
          success: false,
          error: 'Failed to serve application'
        });
      }
    });
  });

  // Global error handler
  app.use((err, req, res, next) => {
    console.error('[Server] Unhandled error:', err);

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  });

  return app;
}

/**
 * Start the server
 */
async function startServer() {
  try {
    console.log('[Server] Air-1 Dashboard Server starting...');

    // Load configuration
    await loadConfig();

    // Test Home Assistant API connection
    console.log('[Server] Testing Home Assistant API connection...');
    const connected = await testConnection();

    if (!connected) {
      console.warn('[Server] WARNING: Could not connect to Home Assistant API');
      console.warn('[Server] Server will start, but API calls may fail');
    } else {
      console.log('[Server] Home Assistant API connection successful');
    }

    // Create and start Express app
    const app = createApp();

    const server = app.listen(PORT, () => {
      console.log(`[Server] Server listening on port ${PORT}`);
      console.log(`[Server] Static files served from: ${STATIC_PATH}`);
      console.log(`[Server] Configuration: sensor_prefix="${appConfig.sensor_prefix}", update_interval=${appConfig.update_interval}s, history_days=${appConfig.history_days}`);
      console.log('[Server] Ready to handle requests');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('[Server] SIGTERM received, shutting down gracefully...');
      server.close(() => {
        console.log('[Server] Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('[Server] SIGINT received, shutting down gracefully...');
      server.close(() => {
        console.log('[Server] Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('[Server] Failed to start server:', error);
    process.exit(1);
  }
}

// Start server if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export { createApp, loadConfig, startServer };
