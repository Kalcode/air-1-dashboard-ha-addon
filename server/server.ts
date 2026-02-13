/**
 * Air-1 Dashboard Server
 *
 * Express server for Home Assistant addon that provides API endpoints
 * for air quality sensor data and serves the dashboard frontend.
 */

import compression from 'compression';
import express, { type Request, type Response, type NextFunction, type Express } from 'express';
import { groupEntitiesByDevice } from './config';
import {
  fetchHistory,
  fetchSensors,
  testConnection,
  transformEntityToSensorData,
  transformHistoryData,
} from './ha-client';
import storageRouter from './storage-routes';
import type { AppConfig, Device, SensorData } from './types';

// Get current file's directory using Bun's built-in
const __dirname = import.meta.dir;

/**
 * Safely extract error message from unknown error type
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

// Configuration
const PORT = process.env.PORT || 8099;
const CONFIG_PATH = process.env.CONFIG_PATH || '/data/options.json';
const STATIC_PATH = process.env.STATIC_PATH || '/app/dashboard/dist';

// Default configuration
const DEFAULT_CONFIG: AppConfig = {
  sensor_prefix: 'apollo_air_1',
  update_interval: 10,
  history_days: 30,
};

let appConfig: AppConfig = { ...DEFAULT_CONFIG };

/**
 * Load configuration from file
 */
async function loadConfig(): Promise<void> {
  try {
    console.log(`[Server] Loading configuration from ${CONFIG_PATH}`);
    const configData = await Bun.file(CONFIG_PATH).text();
    const parsedConfig = JSON.parse(configData) as Partial<AppConfig>;

    appConfig = {
      ...DEFAULT_CONFIG,
      ...parsedConfig,
    };

    console.log('[Server] Configuration loaded:', appConfig);
  } catch (error: unknown) {
    console.warn(`[Server] Could not load config file: ${getErrorMessage(error)}`);
    console.log('[Server] Using default configuration:', DEFAULT_CONFIG);
    appConfig = { ...DEFAULT_CONFIG };
  }
}

/**
 * Create Express application
 */
function createApp(): Express {
  const app = express();

  // Middleware
  app.use(compression()); // Enable gzip compression
  app.use(express.json()); // Parse JSON request bodies

  // Request logging middleware (only log slow requests or errors)
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      // Only log slow requests (>1s) or errors
      if (duration > 1000 || res.statusCode >= 400) {
        console.log(`[Server] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
      }
    });
    next();
  });

  // Normalize paths - remove leading double slashes from ingress
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('//')) {
      req.url = req.url.replace(/^\/+/, '/');
    }
    next();
  });

  // Ingress path debugging (disabled by default, uncomment if needed)
  // app.use((req: Request, res: Response, next: NextFunction) => {
  //   const ingressPath = req.headers['x-ingress-path'];
  //   console.log(`[Server] ${req.method} ${req.path} | Ingress: ${ingressPath || 'NOT SET'}`);
  //   next();
  // });

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      config: {
        sensor_prefix: appConfig.sensor_prefix,
        update_interval: appConfig.update_interval,
        history_days: appConfig.history_days,
      },
    });
  });

  // API Routes

  /**
   * GET /api/config
   * Returns the current addon configuration
   */
  app.get('/api/config', (req: Request, res: Response) => {
    try {
      res.json({
        success: true,
        data: appConfig,
      });
    } catch (error: unknown) {
      console.error('[Server] Error in /api/config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve configuration',
        message: getErrorMessage(error),
      });
    }
  });

  /**
   * GET /api/sensors
   * Discover and return all air quality entities matching the configured prefix
   */
  app.get('/api/sensors', async (req: Request, res: Response) => {
    try {
      const entities = await fetchSensors(appConfig.sensor_prefix);

      if (entities.length === 0) {
        return res.json({
          success: true,
          devices: [],
          message: `No sensors found with prefix "${appConfig.sensor_prefix}"`,
        });
      }

      // Group entities by device
      const grouped = groupEntitiesByDevice(entities, appConfig.sensor_prefix);

      // Transform each device's entities into a device object
      const devices: Device[] = Object.entries(grouped).map(([deviceId, deviceEntities]) => {
        // Get device metadata from first entity
        const firstEntity = deviceEntities[0];
        const deviceName = firstEntity.attributes?.friendly_name || deviceId;

        // Transform entities to sensor data array
        const sensorDataArray = transformEntityToSensorData(deviceEntities, appConfig.sensor_prefix);

        // Combine all sensor readings into a single device object
        const combinedSensorData: Partial<Device> = {};
        for (const sensor of sensorDataArray) {
          if (sensor.sensor_type && sensor.value !== null) {
            // Map sensor_type to the property name expected by the dashboard
            (combinedSensorData as Record<string, unknown>)[sensor.sensor_type] = sensor.value;
          }
        }

        return {
          entity_id: deviceId,
          device_id: deviceId,
          device_name: deviceName,
          friendly_name: `Apollo AIR-1 ${deviceName}`,
          room: null, // Could extract from entity names if needed
          ...combinedSensorData, // Merge all sensor readings (co2, pm25, temperature, etc.)
        } as Device;
      });

      res.json({
        success: true,
        devices: devices,
        count: devices.length,
      });
    } catch (error: unknown) {
      console.error('[Server] Error in /api/sensors:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch sensors',
        message: getErrorMessage(error),
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
  app.get('/api/history/:entity_id', async (req: Request, res: Response) => {
    try {
      const { entity_id } = req.params;
      const { start, end, days } = req.query;

      // Validate entity_id format
      if (!entity_id || !entity_id.includes('.')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid entity_id format',
        });
      }

      // Calculate time range
      let startTime: string;
      if (!start && days) {
        const daysNum = Number.parseInt(days as string, 10);
        if (Number.isNaN(daysNum) || daysNum < 1) {
          return res.status(400).json({
            success: false,
            error: 'Invalid days parameter',
          });
        }
        startTime = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000).toISOString();
      } else if (!start) {
        // Use configured history_days as default
        startTime = new Date(Date.now() - appConfig.history_days * 24 * 60 * 60 * 1000).toISOString();
      } else {
        startTime = start as string;
      }

      const endTime = end ? (end as string) : new Date().toISOString();

      const historyData = await fetchHistory(entity_id, startTime, endTime);

      // Transform history data to time-series format
      const transformedData = transformHistoryData(historyData);

      res.json({
        success: true,
        data: {
          entity_id: entity_id,
          start: startTime,
          end: endTime,
          count: transformedData.length,
          history: transformedData,
        },
      });
    } catch (error: unknown) {
      console.error(`[Server] Error in /api/history/${req.params.entity_id}:`, error);

      res.status(500).json({
        success: false,
        error: 'Failed to fetch history data',
        message: getErrorMessage(error),
      });
    }
  });

  // Mount storage API routes
  app.use('/api/storage', storageRouter);

  // Serve static files from dashboard build directory
  // HA ingress proxy handles path forwarding, so we just serve files as-is
  app.use(express.static(STATIC_PATH));

  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req: Request, res: Response) => {
    // Normalize path to handle double slashes from ingress
    const normalizedPath = req.path.replace(/^\/+/, '/');

    // Skip API routes
    if (normalizedPath.startsWith('/api/')) {
      return res.status(404).json({
        success: false,
        error: 'API endpoint not found',
      });
    }

    // Serve index.html for SPA routing
    // HA ingress proxy handles path forwarding
    res.sendFile(`${STATIC_PATH}/index.html`, (err) => {
      if (err) {
        console.error('[Server] Error serving index.html:', err);
        res.status(500).json({
          success: false,
          error: 'Failed to serve application',
        });
      }
    });
  });

  // Global error handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('[Server] Unhandled error:', err);

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  });

  return app;
}

/**
 * Start the server
 */
async function startServer(): Promise<void> {
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
      console.log(
        `[Server] Configuration: sensor_prefix="${appConfig.sensor_prefix}", update_interval=${appConfig.update_interval}s, history_days=${appConfig.history_days}`,
      );
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
  } catch (error: unknown) {
    console.error('[Server] Failed to start server:', error);
    process.exit(1);
  }
}

// Start server if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export { createApp, loadConfig, startServer };
