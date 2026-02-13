#!/usr/bin/env node

/**
 * Development Preview Server for Air-1 Dashboard
 *
 * This server provides mock data for local testing without needing
 * a real Home Assistant instance. Perfect for rapid iteration!
 *
 * Usage: node dev-server.ts
 * Then open: http://localhost:8099
 */

import compression from 'compression';
import express, { type Request, type Response, type NextFunction } from 'express';
import type { Device, MockReading, MockSensor } from './types';

// Use Bun's built-in directory reference
const __dirname = import.meta.dir;

const app = express();
const PORT = 8099;

// Middleware
app.use(compression());
app.use(express.json());

// CORS middleware for development - allow requests from Astro dev server
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Mock sensor data - matches real Apollo AIR-1 device structure
const MOCK_SENSORS: Record<string, MockSensor> = {
  '2c77c8': {
    entity_id: '2c77c8',
    friendly_name: 'Apollo AIR-1 Apollo AIR-1 2c77c8 ESP Temperature',
    room: null,
    device_name: 'Apollo AIR-1 2c77c8 ESP Temperature',
  },
  '3d88d9': {
    entity_id: '3d88d9',
    friendly_name: 'Apollo AIR-1 Apollo AIR-1 3d88d9 ESP Temperature',
    room: null,
    device_name: 'Apollo AIR-1 3d88d9 ESP Temperature',
  },
  '4e99ea': {
    entity_id: '4e99ea',
    friendly_name: 'Apollo AIR-1 Apollo AIR-1 4e99ea ESP Temperature',
    room: null,
    device_name: 'Apollo AIR-1 4e99ea ESP Temperature',
  },
};

// Generate realistic sensor readings with some variation - matches real API values
function generateMockReading(deviceId: string): MockReading {
  const baseValues: Record<string, { pm25: number; pm10: number; co2: number; temp: number; humidity: number }> = {
    '2c77c8': { pm25: 19, pm10: 21.6, co2: 712, temp: 22.44, humidity: 33.39 },
    '3d88d9': { pm25: 15, pm10: 18.2, co2: 650, temp: 21.5, humidity: 40 },
    '4e99ea': { pm25: 12, pm10: 15.8, co2: 580, temp: 20.8, humidity: 38 },
  };

  const base = baseValues[deviceId] || baseValues['2c77c8'];

  // Add some random variation (±10% for realism)
  const vary = (value: number): number => Math.round(value * (0.9 + Math.random() * 0.2) * 100) / 100;

  return {
    co2: Math.round(vary(base.co2)),
    pm25: Math.round(vary(base.pm25)),
    pm10: vary(base.pm10),
    pm_1um: vary(base.pm25 * 0.85), // Based on real ratio from example
    pm_4um: 0, // Empty in real API
    humidity: vary(base.humidity),
    temperature: vary(base.temp).toFixed(2),
    voc: Math.round(vary(141)),
    vocQuality: '',
    nox: Math.round(vary(1)),
    pressure: (14.56 + (Math.random() - 0.5) * 0.2).toFixed(10), // PSI from real API
    rssi: -50 + Math.floor(Math.random() * 10),
    uptime: '',
    room: MOCK_SENSORS[deviceId]?.room || null,
  };
}

// API Endpoints

// GET /api/config
app.get('/api/config', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      sensor_prefix: 'apollo_air_1',
      update_interval: 10,
      history_days: 30,
    },
  });
});

// GET /api/sensors - Discover available sensors
app.get('/api/sensors', (_req: Request, res: Response) => {
  const devices: Device[] = Object.values(MOCK_SENSORS).map((sensor) => {
    const reading = generateMockReading(sensor.entity_id);
    return {
      entity_id: sensor.entity_id,
      device_id: sensor.entity_id,
      device_name: sensor.device_name,
      friendly_name: sensor.friendly_name,
      room: sensor.room,
      temperature:
        typeof reading.temperature === 'string' ? Number.parseFloat(reading.temperature) : reading.temperature,
      rssi: reading.rssi,
      co2: reading.co2,
      pressure: typeof reading.pressure === 'string' ? Number.parseFloat(reading.pressure) : reading.pressure,
      pm_1um: reading.pm_1um,
      pm25: reading.pm25,
      pm10: reading.pm10,
      voc: reading.voc,
      nox: reading.nox,
      humidity: reading.humidity,
    };
  });

  res.json({
    success: true,
    devices,
    count: devices.length,
  });
});

// GET /api/history/:entity_id - Get historical data
app.get('/api/history/:entity_id', (req: Request, res: Response) => {
  const entityId = req.params.entity_id;
  const days = Number.parseInt(req.query.days as string) || 30;

  if (!MOCK_SENSORS[entityId]) {
    return res.status(404).json({
      success: false,
      error: 'Sensor not found',
      message: `Entity ${entityId} does not exist`,
    });
  }

  // Generate some historical readings
  const history: Array<{
    timestamp: string;
    value: number | null;
    state: string;
    attributes: Record<string, unknown>;
  }> = [];
  const now = Date.now();
  const intervalsPerDay = 24; // One reading per hour
  const totalReadings = Math.min(days * intervalsPerDay, 200); // Cap at 200 readings

  for (let i = 0; i < totalReadings; i++) {
    const timestamp = now - i * 3600000; // Go back in time by hours
    const reading = generateMockReading(entityId);
    const timestampISO = new Date(timestamp).toISOString();

    history.push({
      timestamp: timestampISO,
      value: reading.co2,
      state: reading.co2.toString(),
      attributes: {},
    });
  }

  const startTime = new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
  const endTime = new Date().toISOString();

  res.json({
    success: true,
    data: {
      entity_id: entityId,
      start: startTime,
      end: endTime,
      count: history.length,
      history,
    },
  });
});

// Mock storage - in-memory array with some initial readings
const mockStorageReadings: Array<{
  id: string;
  device_id: string | null;
  room: string;
  timestamp: number;
  created_at: string;
  data: Record<string, string>;
}> = [
  {
    id: 'mock-reading-1',
    device_id: '2c77c8',
    room: 'Office',
    timestamp: Date.now() - 3600000, // 1 hour ago
    created_at: new Date(Date.now() - 3600000).toISOString(),
    data: {
      co2: '710',
      pm25: '18',
      temperature: '22.5',
      humidity: '34',
      voc: '140',
      nox: '1',
      pressure: '14.56',
      rssi: '-48',
    },
  },
  {
    id: 'mock-reading-2',
    device_id: '2c77c8',
    room: 'Office',
    timestamp: Date.now() - 7200000, // 2 hours ago
    created_at: new Date(Date.now() - 7200000).toISOString(),
    data: {
      co2: '685',
      pm25: '20',
      temperature: '22.2',
      humidity: '35',
      voc: '145',
      nox: '1',
      pressure: '14.55',
      rssi: '-50',
    },
  },
];

// GET /api/storage/readings - Get stored readings
app.get('/api/storage/readings', (_req: Request, res: Response) => {
  const limit = Number.parseInt(_req.query.limit as string) || 50;
  const offset = Number.parseInt(_req.query.offset as string) || 0;

  const paginatedReadings = mockStorageReadings.slice(offset, offset + limit);

  res.json({
    readings: paginatedReadings,
    pagination: {
      limit,
      offset,
      count: paginatedReadings.length,
    },
  });
});

// POST /api/storage/readings - Save a new reading
app.post('/api/storage/readings', (req: Request, res: Response) => {
  const { data, room, device_id, timestamp } = req.body;

  if (!data || !room) {
    return res.status(400).json({ error: 'Missing required fields: data, room' });
  }

  const id = `mock-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const readingTimestamp = timestamp || Date.now();

  const newReading = {
    id,
    device_id: device_id || null,
    room,
    timestamp: readingTimestamp,
    created_at: new Date(readingTimestamp).toISOString(),
    data,
  };

  // Add to beginning of array (most recent first)
  mockStorageReadings.unshift(newReading);

  res.status(201).json({
    id,
    timestamp: readingTimestamp,
    success: true,
  });
});

// DELETE /api/storage/readings/:id - Delete a specific reading
app.delete('/api/storage/readings/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = mockStorageReadings.findIndex((r) => r.id === id);

  if (index !== -1) {
    mockStorageReadings.splice(index, 1);
  }

  res.json({
    success: true,
    message: `Reading ${id} deleted`,
  });
});

// DELETE /api/storage/readings - Clear all readings
app.delete('/api/storage/readings', (_req: Request, res: Response) => {
  const count = mockStorageReadings.length;
  mockStorageReadings.length = 0;

  res.json({
    success: true,
    message: `Cleared ${count} readings`,
  });
});

// GET /api/storage/export - Export all readings
app.get('/api/storage/export', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="air_quality_export.json"');

  res.json({
    export_date: new Date().toISOString(),
    version: '1.0',
    readings: mockStorageReadings,
  });
});

// POST /api/storage/import - Import readings
app.post('/api/storage/import', (req: Request, res: Response) => {
  const { readings } = req.body;

  if (!Array.isArray(readings)) {
    return res.status(400).json({ error: 'Invalid import format: readings must be an array' });
  }

  let imported = 0;
  for (const reading of readings) {
    if (reading.id && reading.data && reading.room) {
      mockStorageReadings.push(reading);
      imported++;
    }
  }

  res.json({
    success: true,
    imported,
    errors: 0,
    total: readings.length,
  });
});

// GET /api/storage/stats - Get storage statistics
app.get('/api/storage/stats', (_req: Request, res: Response) => {
  const timestamps = mockStorageReadings.map((r) => r.timestamp);
  const devices = [...new Set(mockStorageReadings.map((r) => r.device_id).filter(Boolean))];
  const rooms = [...new Set(mockStorageReadings.map((r) => r.room))];

  res.json({
    total_readings: mockStorageReadings.length,
    oldest_timestamp: timestamps.length ? Math.min(...timestamps) : null,
    newest_timestamp: timestamps.length ? Math.max(...timestamps) : null,
    devices,
    rooms,
    database_path: ':memory:',
  });
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    mode: 'development',
    message: 'Mock server running with fake data',
    timestamp: new Date().toISOString(),
  });
});

// Serve static dashboard files
const distPath = `${__dirname}/../dashboard/dist`;
app.use(express.static(distPath));

// SPA fallback - serve index.html for all other routes
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(`${distPath}/index.html`);
});

// Start server
app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  🚀 Air-1 Dashboard Development Server                ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  console.log(`  📡 Server running on: http://localhost:${PORT}`);
  console.log(`  📂 Serving files from: ${distPath}`);
  console.log('  🎭 Mode: MOCK DATA (fake sensors)\n');
  console.log('  Available mock sensors:');
  for (const sensor of Object.values(MOCK_SENSORS)) {
    console.log(`    • ${sensor.friendly_name} (${sensor.entity_id})`);
  }
  console.log('\n  📊 API Endpoints:');
  console.log(`    • GET    http://localhost:${PORT}/api/config`);
  console.log(`    • GET    http://localhost:${PORT}/api/sensors`);
  console.log(`    • GET    http://localhost:${PORT}/api/history/:entity_id`);
  console.log('\n  💾 Storage Endpoints (in-memory):');
  console.log(`    • GET    http://localhost:${PORT}/api/storage/readings`);
  console.log(`    • POST   http://localhost:${PORT}/api/storage/readings`);
  console.log(`    • DELETE http://localhost:${PORT}/api/storage/readings/:id`);
  console.log(`    • GET    http://localhost:${PORT}/api/storage/export`);
  console.log(`    • POST   http://localhost:${PORT}/api/storage/import`);
  console.log(`    • GET    http://localhost:${PORT}/api/storage/stats`);
  console.log(`\n  📦 Mock storage: ${mockStorageReadings.length} initial readings`);
  console.log('\n  Press Ctrl+C to stop\n');
});
