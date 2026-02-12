#!/usr/bin/env node

/**
 * Development Preview Server for Air-1 Dashboard
 *
 * This server provides mock data for local testing without needing
 * a real Home Assistant instance. Perfect for rapid iteration!
 *
 * Usage: node dev-server.js
 * Then open: http://localhost:8099
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import compression from 'compression';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 8099;

// Middleware
app.use(compression());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Mock sensor data - realistic Apollo AIR-1 values
const MOCK_SENSORS = {
  'sensor.air1_bedroom': {
    entity_id: 'sensor.air1_bedroom',
    friendly_name: 'Bedroom Air Quality',
    room: 'Bedroom',
    device_name: 'Bedroom AIR-1',
  },
  'sensor.air1_living_room': {
    entity_id: 'sensor.air1_living_room',
    friendly_name: 'Living Room Air Quality',
    room: 'Living Room',
    device_name: 'Living Room AIR-1',
  },
  'sensor.air1_office': {
    entity_id: 'sensor.air1_office',
    friendly_name: 'Office Air Quality',
    room: 'Office',
    device_name: 'Office AIR-1',
  },
};

// Generate realistic sensor readings with some variation
function generateMockReading(entityId) {
  const baseValues = {
    'sensor.air1_bedroom': { pm25: 8, pm10: 12, co2: 650, temp: 21, humidity: 45 },
    'sensor.air1_living_room': { pm25: 15, pm10: 22, co2: 850, temp: 22, humidity: 48 },
    'sensor.air1_office': { pm25: 6, pm10: 10, co2: 580, temp: 20, humidity: 42 },
  };

  const base = baseValues[entityId] || baseValues['sensor.air1_bedroom'];

  // Add some random variation (±20%)
  const vary = (value) => Math.round(value * (0.8 + Math.random() * 0.4));

  return {
    co2: vary(base.co2),
    pm25: vary(base.pm25),
    pm10: vary(base.pm10),
    pm_1um: vary(base.pm25 * 0.3),
    pm_4um: vary(base.pm25 * 0.5),
    humidity: vary(base.humidity),
    temperature: (base.temp + (Math.random() - 0.5) * 2).toFixed(1),
    voc: vary(120),
    vocQuality: 'Good',
    nox: vary(15),
    pressure: (1013 + (Math.random() - 0.5) * 10).toFixed(1),
    rssi: -45 - Math.floor(Math.random() * 30),
    uptime: `${Math.floor(Math.random() * 30)}d ${Math.floor(Math.random() * 24)}h`,
    room: MOCK_SENSORS[entityId]?.room || 'Unknown',
  };
}

// API Endpoints

// GET /api/config
app.get('/api/config', (req, res) => {
  res.json({
    sensor_prefix: 'air1',
    update_interval: 60,
    history_days: 30,
  });
});

// GET /api/sensors - Discover available sensors
app.get('/api/sensors', (req, res) => {
  const devices = Object.values(MOCK_SENSORS).map((sensor) => ({
    entity_id: sensor.entity_id,
    friendly_name: sensor.friendly_name,
    room: sensor.room,
    device_name: sensor.device_name,
  }));

  res.json({
    devices,
    total: devices.length,
  });
});

// GET /api/sensors/:entity_id - Get current sensor reading
app.get('/api/sensors/:entity_id', (req, res) => {
  const entityId = req.params.entity_id;

  if (!MOCK_SENSORS[entityId]) {
    return res.status(404).json({
      error: 'Sensor not found',
      message: `Entity ${entityId} does not exist`,
    });
  }

  const reading = generateMockReading(entityId);
  res.json(reading);
});

// GET /api/history/:entity_id - Get historical data
app.get('/api/history/:entity_id', (req, res) => {
  const entityId = req.params.entity_id;
  const days = Number.parseInt(req.query.days) || 30;

  if (!MOCK_SENSORS[entityId]) {
    return res.status(404).json({
      error: 'Sensor not found',
      message: `Entity ${entityId} does not exist`,
    });
  }

  // Generate some historical readings
  const history = [];
  const now = Date.now();
  const intervalsPerDay = 24; // One reading per hour
  const totalReadings = Math.min(days * intervalsPerDay, 200); // Cap at 200 readings

  for (let i = 0; i < totalReadings; i++) {
    const timestamp = now - i * 3600000; // Go back in time by hours
    const reading = generateMockReading(entityId);

    history.push({
      id: `${entityId}_${timestamp}`,
      entity_id: entityId,
      timestamp,
      time: new Date(timestamp).toLocaleTimeString(),
      date: new Date(timestamp).toLocaleDateString(),
      room: MOCK_SENSORS[entityId].room,
      data: reading,
    });
  }

  res.json(history);
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'development',
    message: 'Mock server running with fake data',
    timestamp: new Date().toISOString(),
  });
});

// Serve static dashboard files
const distPath = path.join(__dirname, '..', 'dashboard', 'dist');
app.use(express.static(distPath));

// SPA fallback - serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
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
  console.log(`    • GET  http://localhost:${PORT}/api/config`);
  console.log(`    • GET  http://localhost:${PORT}/api/sensors`);
  console.log(`    • GET  http://localhost:${PORT}/api/sensors/:entity_id`);
  console.log(`    • GET  http://localhost:${PORT}/api/history/:entity_id`);
  console.log('\n  Press Ctrl+C to stop\n');
});
