/**
 * Test Temperature Conversion Logic
 *
 * Critical test: Verify F→C conversion with calibration offset
 * Expected: 75.5°F + 2°C offset = 26.17°C
 */

import { transformEntityToSensorData } from './ha-client';
import type { HAEntity } from './types';

console.log('='.repeat(70));
console.log('Temperature Conversion Test');
console.log('='.repeat(70));
console.log();

// Test 1: Basic F→C conversion without offset
console.log('[Test 1] Basic F→C Conversion (no offset)');
console.log('-'.repeat(70));
const entity1: HAEntity = {
  entity_id: 'sensor.test_temp',
  state: '75.5',
  attributes: {
    unit_of_measurement: '°F',
    device_class: 'temperature',
  },
  last_changed: new Date().toISOString(),
  last_updated: new Date().toISOString(),
};

const result1 = transformEntityToSensorData([entity1])[0];
console.log(`Input: ${entity1.state}°F`);
console.log(`Output: ${result1.value}°C`);
console.log('Expected: 24.17°C');
console.log('Formula: (75.5 - 32) * 5 / 9 = 24.166... → 24.17°C (rounded)');
console.log(`Match: ${result1.value === 24.17 ? '✅ PASS' : '❌ FAIL'}`);
console.log();

// Test 2: F→C conversion WITH calibration offset
console.log('[Test 2] F→C Conversion WITH 2°C Calibration Offset');
console.log('-'.repeat(70));
const entity2: HAEntity = {
  entity_id: 'sensor.test_temp',
  state: '75.5',
  attributes: {
    unit_of_measurement: '°F',
    device_class: 'temperature',
  },
  last_changed: new Date().toISOString(),
  last_updated: new Date().toISOString(),
  _offset: 2.0,
  _offset_entity: 'number.test_temp_offset',
};

const result2 = transformEntityToSensorData([entity2])[0];
console.log(`Input: ${entity2.state}°F with +${entity2._offset}°C offset`);
console.log(`Output: ${result2.value}°C`);
console.log('Expected: 26.17°C');
console.log('Step 1: (75.5 - 32) * 5 / 9 = 24.17°C');
console.log('Step 2: 24.17°C + 2.0°C offset = 26.17°C');
console.log(`Match: ${result2.value === 26.17 ? '✅ PASS' : '❌ FAIL'}`);
console.log();

// Test 3: C→C (no conversion needed, only offset)
console.log('[Test 3] Celsius Input WITH 2°C Calibration Offset');
console.log('-'.repeat(70));
const entity3: HAEntity = {
  entity_id: 'sensor.test_temp',
  state: '22.5',
  attributes: {
    unit_of_measurement: '°C',
    device_class: 'temperature',
  },
  last_changed: new Date().toISOString(),
  last_updated: new Date().toISOString(),
  _offset: 2.0,
  _offset_entity: 'number.test_temp_offset',
};

const result3 = transformEntityToSensorData([entity3])[0];
console.log(`Input: ${entity3.state}°C with +${entity3._offset}°C offset`);
console.log(`Output: ${result3.value}°C`);
console.log('Expected: 24.5°C');
console.log('Formula: 22.5°C + 2.0°C offset = 24.5°C');
console.log(`Match: ${result3.value === 24.5 ? '✅ PASS' : '❌ FAIL'}`);
console.log();

// Test 4: Negative offset
console.log('[Test 4] F→C Conversion WITH -1.5°C Calibration Offset');
console.log('-'.repeat(70));
const entity4: HAEntity = {
  entity_id: 'sensor.test_temp',
  state: '68.0',
  attributes: {
    unit_of_measurement: '°F',
    device_class: 'temperature',
  },
  last_changed: new Date().toISOString(),
  last_updated: new Date().toISOString(),
  _offset: -1.5,
  _offset_entity: 'number.test_temp_offset',
};

const result4 = transformEntityToSensorData([entity4])[0];
console.log(`Input: ${entity4.state}°F with ${entity4._offset}°C offset`);
console.log(`Output: ${result4.value}°C`);
console.log('Expected: 18.5°C');
console.log('Step 1: (68.0 - 32) * 5 / 9 = 20.0°C');
console.log('Step 2: 20.0°C - 1.5°C offset = 18.5°C');
console.log(`Match: ${result4.value === 18.5 ? '✅ PASS' : '❌ FAIL'}`);
console.log();

// Summary
console.log('='.repeat(70));
console.log('Temperature Conversion Test Summary');
console.log('='.repeat(70));
const allPassed =
  result1.value === 24.17 && result2.value === 26.17 && result3.value === 24.5 && result4.value === 18.5;
console.log(`All Tests: ${allPassed ? '✅ ALL PASSED' : '❌ SOME FAILED'}`);
console.log();

if (!allPassed) {
  process.exit(1);
}
