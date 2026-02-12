/**
 * Example/Test Script for Air-1 Dashboard Server
 *
 * This script demonstrates how to use the server components
 * and can be used for testing during development.
 *
 * Usage:
 *   export SUPERVISOR_TOKEN="your_token"
 *   export HA_API_BASE="http://homeassistant.local:8123/api"
 *   node test-example.js
 */

import { extractSensorType, getDeviceName, groupEntitiesByDevice, parseEntityId } from './config.js';
import {
  fetchHistory,
  fetchSensors,
  fetchState,
  testConnection,
  transformEntityToSensorData,
  transformHistoryData,
} from './ha-client.js';

async function runTests() {
  console.log('='.repeat(60));
  console.log('Air-1 Dashboard Server - Test Examples');
  console.log('='.repeat(60));
  console.log();

  // Test 1: Connection
  console.log('[Test 1] Testing Home Assistant API Connection');
  console.log('-'.repeat(60));
  try {
    const connected = await testConnection();
    console.log(`Connection status: ${connected ? 'SUCCESS' : 'FAILED'}`);
  } catch (error) {
    console.error('Connection test failed:', error.message);
  }
  console.log();

  // Test 2: Parse Entity ID
  console.log('[Test 2] Parse Entity ID');
  console.log('-'.repeat(60));
  const testEntityIds = ['sensor.air1_bedroom_pm25', 'sensor.air1_living_room_temperature', 'sensor.air1_office_co2'];

  for (const entityId of testEntityIds) {
    const parsed = parseEntityId(entityId, 'air1');
    console.log(`${entityId}`);
    console.log(`  Device: ${parsed.device} (${getDeviceName(parsed.device)})`);
    console.log(`  Sensor: ${parsed.sensor}`);
    console.log();
  }

  // Test 3: Fetch Sensors
  console.log('[Test 3] Fetch All Sensors');
  console.log('-'.repeat(60));
  try {
    const sensors = await fetchSensors('air1');
    console.log(`Found ${sensors.length} sensors:`);

    if (sensors.length > 0) {
      // Show first 5 sensors
      sensors.slice(0, 5).forEach((sensor) => {
        console.log(`  - ${sensor.entity_id}: ${sensor.state} ${sensor.attributes?.unit_of_measurement || ''}`);
      });

      if (sensors.length > 5) {
        console.log(`  ... and ${sensors.length - 5} more`);
      }
    }
  } catch (error) {
    console.error('Failed to fetch sensors:', error.message);
  }
  console.log();

  // Test 4: Transform Sensor Data
  console.log('[Test 4] Transform Sensor Data');
  console.log('-'.repeat(60));
  try {
    const sensors = await fetchSensors('air1');

    if (sensors.length > 0) {
      const transformed = transformEntityToSensorData(sensors, 'air1');
      console.log(`Transformed ${transformed.length} sensors`);

      // Show first transformed sensor
      if (transformed[0]) {
        console.log('\nExample transformed sensor:');
        console.log(JSON.stringify(transformed[0], null, 2));
      }
    }
  } catch (error) {
    console.error('Failed to transform sensor data:', error.message);
  }
  console.log();

  // Test 5: Group by Device
  console.log('[Test 5] Group Sensors by Device');
  console.log('-'.repeat(60));
  try {
    const sensors = await fetchSensors('air1');

    if (sensors.length > 0) {
      const grouped = groupEntitiesByDevice(sensors, 'air1');
      console.log(`Found ${Object.keys(grouped).length} devices:\n`);

      for (const [device, deviceSensors] of Object.entries(grouped)) {
        console.log(`  ${getDeviceName(device)} (${device}):`);
        console.log(`    ${deviceSensors.length} sensors`);
      }
    }
  } catch (error) {
    console.error('Failed to group sensors:', error.message);
  }
  console.log();

  // Test 6: Fetch State
  console.log('[Test 6] Fetch Sensor State');
  console.log('-'.repeat(60));
  try {
    const sensors = await fetchSensors('air1');

    if (sensors.length > 0) {
      const entityId = sensors[0].entity_id;
      console.log(`Fetching state for: ${entityId}`);

      const state = await fetchState(entityId);
      console.log('\nCurrent State:');
      console.log(`  State: ${state.state}`);
      console.log(`  Unit: ${state.attributes?.unit_of_measurement || 'N/A'}`);
      console.log(`  Last Updated: ${state.last_updated}`);
      console.log(`  Friendly Name: ${state.attributes?.friendly_name || 'N/A'}`);
    }
  } catch (error) {
    console.error('Failed to fetch state:', error.message);
  }
  console.log();

  // Test 7: Fetch History
  console.log('[Test 7] Fetch Historical Data');
  console.log('-'.repeat(60));
  try {
    const sensors = await fetchSensors('air1');

    if (sensors.length > 0) {
      const entityId = sensors[0].entity_id;
      console.log(`Fetching 24h history for: ${entityId}`);

      // Get last 24 hours
      const end = new Date();
      const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);

      const history = await fetchHistory(entityId, start.toISOString(), end.toISOString());
      console.log(`\nRetrieved ${history.length} history records`);

      if (history.length > 0) {
        const transformed = transformHistoryData(history);
        console.log(`Transformed to ${transformed.length} valid data points`);

        // Show first and last record
        if (transformed.length > 0) {
          console.log('\nFirst record:');
          console.log(`  Time: ${transformed[0].timestamp}`);
          console.log(`  Value: ${transformed[0].value}`);

          console.log('\nLast record:');
          console.log(`  Time: ${transformed[transformed.length - 1].timestamp}`);
          console.log(`  Value: ${transformed[transformed.length - 1].value}`);
        }
      }
    }
  } catch (error) {
    console.error('Failed to fetch history:', error.message);
  }
  console.log();

  // Test 8: Extract Sensor Type
  console.log('[Test 8] Extract Sensor Type');
  console.log('-'.repeat(60));
  const testSensorIds = [
    { id: 'sensor.air1_bedroom_pm25', attrs: { device_class: 'pm25' } },
    { id: 'sensor.air1_living_room_co2', attrs: { device_class: 'carbon_dioxide' } },
    { id: 'sensor.air1_office_temperature', attrs: { unit_of_measurement: '°C' } },
    { id: 'sensor.air1_kitchen_humidity', attrs: { unit_of_measurement: '%' } },
  ];

  for (const test of testSensorIds) {
    const sensorType = extractSensorType(test.id, test.attrs, 'air1');
    console.log(`${test.id}`);
    console.log(`  Detected type: ${sensorType || 'unknown'}`);
    console.log();
  }

  console.log('='.repeat(60));
  console.log('Tests completed!');
  console.log('='.repeat(60));
}

// Run tests
runTests().catch((error) => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
