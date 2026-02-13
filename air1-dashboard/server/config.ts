/**
 * Entity Mapping Configuration
 *
 * Maps Home Assistant entity attributes to sensor data fields.
 * Each field contains an array of possible attribute names for fuzzy matching.
 */

import type { DeviceClassMap, EntityMappings, ParsedEntityId, SensorType, UnitMap } from './types';

export const ENTITY_MAPPINGS: EntityMappings = {
  pm25: ['pm_2_5', 'pm25', 'pm_2.5', 'pm_2_5_concentration', 'particulate_matter_2_5', 'particulate_matter_25'],
  pm10: ['pm_10', 'pm10', 'pm_10_concentration', 'particulate_matter_10', 'particulate_matter_100'],
  pm_1um: ['pm_1_0', 'pm1', 'pm_1', 'pm_1_0_concentration', 'particulate_matter_1_0', 'particulate_matter_10'],
  pm_4um: ['pm_4_0', 'pm4', 'pm_4', 'pm_4_0_concentration', 'particulate_matter_4_0', 'particulate_matter_40'],
  co2: ['co2', 'carbon_dioxide', 'co2_concentration', 'carbondioxide'],
  voc: ['voc', 'tvoc', 'volatile_organic_compounds', 'voc_index', 'total_volatile_organic_compounds'],
  humidity: ['humidity', 'relative_humidity', 'rh'],
  temperature: ['temperature', 'temp', 'air_temperature'],
  pressure: ['pressure', 'atmospheric_pressure', 'air_pressure', 'barometric_pressure'],
  nox: ['nox', 'nitrogen_oxides', 'nox_index', 'nitrogen_oxide'],
  rssi: ['rssi', 'wifi_signal', 'signal_strength', 'wifi_rssi'],
};

/**
 * Parse entity ID to extract device/room name
 * @param entityId - Entity ID like "sensor.apollo_air_1_2c77c8_esp_temperature"
 * @param prefix - Sensor prefix like "apollo_air_1"
 * @returns { device: "2c77c8", sensor: "temperature" }
 */
export function parseEntityId(entityId: string, prefix = 'air1'): ParsedEntityId {
  // Remove "sensor." prefix if present
  const cleanId = entityId.replace(/^sensor\./, '');

  // Remove the configured prefix
  const prefixPattern = new RegExp(`^${prefix}_`, 'i');
  const withoutPrefix = cleanId.replace(prefixPattern, '');

  // Split by underscore to get parts
  const parts = withoutPrefix.split('_');

  if (parts.length < 2) {
    return {
      device: parts[0] || 'unknown',
      sensor: 'unknown',
    };
  }

  // For Apollo AIR-1: first part is device ID (e.g., "2c77c8")
  // Format: {device_id}_{component}_{sensor} or {device_id}_{sensor}
  // We want just the device ID (usually a short hex code)
  const device = parts[0];
  const sensor = parts[parts.length - 1];

  return { device, sensor };
}

/**
 * Group entities by device/room
 * @param entities - Array of Home Assistant entities
 * @param prefix - Sensor prefix
 * @returns { "bedroom": [...entities], "living_room": [...entities] }
 */
export function groupEntitiesByDevice<T extends { entity_id: string }>(
  entities: T[],
  prefix = 'air1',
): Record<string, T[]> {
  const grouped: Record<string, T[]> = {};

  for (const entity of entities) {
    const { device } = parseEntityId(entity.entity_id, prefix);

    if (!grouped[device]) {
      grouped[device] = [];
    }

    grouped[device].push(entity);
  }

  return grouped;
}

/**
 * Find matching attribute name from entity attributes
 * @param attributes - Entity attributes object
 * @param possibleNames - Array of possible attribute names
 * @returns Matched attribute name or null
 */
export function findMatchingAttribute(
  attributes: Record<string, unknown> | undefined,
  possibleNames: string[],
): string | null {
  if (!attributes || typeof attributes !== 'object') {
    return null;
  }

  const attributeKeys = Object.keys(attributes).map((k) => k.toLowerCase());

  for (const name of possibleNames) {
    const normalized = name.toLowerCase();
    if (attributeKeys.includes(normalized)) {
      // Return the original key with correct casing
      return Object.keys(attributes).find((k) => k.toLowerCase() === normalized) || null;
    }
  }

  return null;
}

/**
 * Extract sensor type from entity ID or attributes
 * @param entityId - Entity ID
 * @param attributes - Entity attributes
 * @param prefix - Sensor prefix
 * @returns Sensor type (pm25, co2, etc.) or null
 */
export function extractSensorType(
  entityId: string,
  attributes: Record<string, unknown> = {},
  prefix = 'air1',
): SensorType | null {
  const { sensor } = parseEntityId(entityId, prefix);
  const normalizedSensor = sensor.toLowerCase();

  // Check direct mapping from entity ID
  for (const [type, possibleNames] of Object.entries(ENTITY_MAPPINGS)) {
    if (possibleNames.some((name) => normalizedSensor.includes(name.toLowerCase().replace(/_/g, '')))) {
      return type as SensorType;
    }
  }

  // Check device_class attribute
  if (attributes.device_class && typeof attributes.device_class === 'string') {
    const deviceClass = attributes.device_class.toLowerCase();

    const deviceClassMap: DeviceClassMap = {
      pm25: 'pm25',
      pm10: 'pm10',
      pm1: 'pm_1um',
      pm4: 'pm_4um',
      carbon_dioxide: 'co2',
      volatile_organic_compounds: 'voc',
      humidity: 'humidity',
      temperature: 'temperature',
      pressure: 'pressure',
      nitrogen_oxides: 'nox',
      signal_strength: 'rssi',
    };

    if (deviceClassMap[deviceClass]) {
      return deviceClassMap[deviceClass];
    }
  }

  // Check unit_of_measurement as last resort
  if (attributes.unit_of_measurement && typeof attributes.unit_of_measurement === 'string') {
    const unit = attributes.unit_of_measurement.toLowerCase();

    const unitMap: UnitMap = {
      'µg/m³': 'pm25', // Could be pm25, pm10, etc.
      ppm: 'co2',
      '%': 'humidity',
      '°c': 'temperature',
      '°f': 'temperature',
      hpa: 'pressure',
      mbar: 'pressure',
      dbm: 'rssi',
    };

    if (unitMap[unit]) {
      return unitMap[unit];
    }
  }

  return null;
}

/**
 * Get human-readable device name
 * @param device - Device ID like "bedroom" or "living_room"
 * @returns Formatted name like "Bedroom" or "Living Room"
 */
export function getDeviceName(device: string): string {
  if (!device) return 'Unknown';

  return device
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default {
  ENTITY_MAPPINGS,
  parseEntityId,
  groupEntitiesByDevice,
  findMatchingAttribute,
  extractSensorType,
  getDeviceName,
};
