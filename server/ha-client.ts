/**
 * Home Assistant API Client
 *
 * Handles all API interactions with Home Assistant Supervisor using native fetch
 */

import { extractSensorType, getDeviceName, parseEntityId } from './config';
import type { HAEntity, HAHistoryRecord, SensorData, SensorType, TimeSeriesDataPoint } from './types';

const HA_API_BASE = process.env.HA_API_BASE || 'http://supervisor/core/api';
const SUPERVISOR_TOKEN = process.env.SUPERVISOR_TOKEN;

/**
 * Safely extract error message from unknown error type
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * Helper function to make fetch requests to Home Assistant API
 */
async function haFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${HA_API_BASE}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${SUPERVISOR_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    signal: AbortSignal.timeout(30000), // 30 second timeout
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json() as T;
}

/**
 * Fetch all sensors matching the prefix
 * @param prefix - Sensor prefix (e.g., "air1")
 * @returns Array of sensor entities
 */
export async function fetchSensors(prefix = 'air1'): Promise<HAEntity[]> {
  try {
    console.log(`[HA Client] Fetching sensors with prefix: ${prefix}`);

    const states = await haFetch<HAEntity[]>('/states');

    // Filter for sensors matching the prefix
    const pattern = new RegExp(`^sensor\\.${prefix}_`, 'i');
    const matchingSensors = states.filter((entity) => pattern.test(entity.entity_id));

    // Also find number.* offset entities for calibration
    const offsetPattern = new RegExp(`^number\\.${prefix}_.*_offset$`, 'i');
    const offsets = states.filter((entity) => offsetPattern.test(entity.entity_id));
    if (offsets.length > 0) {
      console.log(
        `[HA Client] Found ${offsets.length} offset entities:`,
        offsets.map((o) => `${o.entity_id}=${o.state}`),
      );
    }

    // Attach offsets to matching sensors so transformEntity can use them
    // e.g. sensor.apollo_air_1_2c77c8_sen55_temperature
    //   -> number.apollo_air_1_2c77c8_sen55_temperature_offset
    for (const sensor of matchingSensors) {
      const sensorBase = sensor.entity_id.replace(/^sensor\./, '');
      const matchingOffset = offsets.find((o) => {
        const offsetBase = o.entity_id.replace(/^number\./, '').replace(/_offset$/, '');
        return sensorBase === offsetBase;
      });
      if (matchingOffset) {
        const offsetVal = Number.parseFloat(matchingOffset.state);
        if (!Number.isNaN(offsetVal)) {
          sensor._offset = offsetVal;
          sensor._offset_entity = matchingOffset.entity_id;
          console.log(`[HA Client] Matched offset ${matchingOffset.entity_id}=${offsetVal} to ${sensor.entity_id}`);
        }
      }
    }

    console.log(`[HA Client] Found ${matchingSensors.length} matching sensors`);

    return matchingSensors;
  } catch (error: unknown) {
    console.error('[HA Client] Error fetching sensors:', getErrorMessage(error));
    throw new Error(`Failed to fetch sensors: ${getErrorMessage(error)}`);
  }
}

/**
 * Fetch current state for a specific entity
 * @param entityId - Entity ID (e.g., "sensor.air1_bedroom_pm25")
 * @returns Entity state object
 */
export async function fetchState(entityId: string): Promise<HAEntity> {
  try {
    console.log(`[HA Client] Fetching state for entity: ${entityId}`);

    const entity = await haFetch<HAEntity>(`/states/${entityId}`);

    return entity;
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    console.error(`[HA Client] Error fetching state for ${entityId}:`, errorMessage);

    // Check if it's a 404 error
    if (errorMessage.includes('404')) {
      throw new Error(`Entity not found: ${entityId}`);
    }

    throw new Error(`Failed to fetch state: ${errorMessage}`);
  }
}

/**
 * Fetch historical data for an entity
 * @param entityId - Entity ID
 * @param start - ISO timestamp for start (optional)
 * @param end - ISO timestamp for end (optional)
 * @returns Array of historical state records
 */
export async function fetchHistory(entityId: string, start?: string, end?: string): Promise<HAHistoryRecord[]> {
  try {
    console.log(`[HA Client] Fetching history for entity: ${entityId}`);

    // Build query parameters
    const params = new URLSearchParams();
    if (start) params.set('start_time', start);
    if (end) params.set('end_time', end);

    const query = params.toString();
    const path = `/history/period${query ? `?${query}` : ''}`;

    const history = await haFetch<HAHistoryRecord[][]>(path);

    // HA returns nested array: [[entity_history]]
    const entityHistory = history[0] || [];

    console.log(`[HA Client] Retrieved ${entityHistory.length} history records`);

    return entityHistory;
  } catch (error: unknown) {
    console.error(`[HA Client] Error fetching history for ${entityId}:`, getErrorMessage(error));
    throw new Error(`Failed to fetch history: ${getErrorMessage(error)}`);
  }
}

/**
 * Transform Home Assistant entity to SensorData format
 * @param entity - HA entity object
 * @param prefix - Sensor prefix
 * @returns Transformed sensor data
 */
export function transformEntityToSensorData(entities: HAEntity[], prefix = 'air1'): SensorData[] {
  return entities.map((entity) => {
    const { device, sensor } = parseEntityId(entity.entity_id, prefix);
    const sensorType = extractSensorType(entity.entity_id, entity.attributes, prefix);

    // Parse numeric value from state
    let value: number | null = null;
    const numericValue = Number.parseFloat(entity.state);
    if (!Number.isNaN(numericValue)) {
      value = numericValue;
    }

    // Get unit and device class
    let unit: string | null = null;
    if (entity.attributes.unit_of_measurement && typeof entity.attributes.unit_of_measurement === 'string') {
      unit = entity.attributes.unit_of_measurement;
    }

    let deviceClass: string | null = null;
    if (entity.attributes.device_class && typeof entity.attributes.device_class === 'string') {
      deviceClass = entity.attributes.device_class;
    }

    // CRITICAL: Temperature conversion logic
    // F to C conversion BEFORE applying offset
    if (sensorType === 'temperature' && value !== null && unit === '°F') {
      value = Math.round((((value - 32) * 5) / 9) * 100) / 100;
      unit = '°C';
    }

    // Apply calibration offset AFTER unit conversion
    if (value !== null && entity._offset != null) {
      value = Math.round((value + entity._offset) * 100) / 100;
    }

    let friendlyName = 'Unknown';
    if (entity.attributes.friendly_name && typeof entity.attributes.friendly_name === 'string') {
      friendlyName = entity.attributes.friendly_name;
    }

    return {
      entity_id: entity.entity_id,
      device,
      device_name: getDeviceName(device),
      sensor,
      sensor_type: sensorType,
      value,
      unit,
      state: entity.state,
      friendly_name: friendlyName,
      device_class: deviceClass,
      last_updated: entity.last_updated,
      last_changed: entity.last_changed,
      attributes: entity.attributes,
    };
  });
}

/**
 * Transform historical data to time-series format
 * @param history - Array of historical state records
 * @param prefix - Sensor prefix
 * @returns Transformed time-series data
 */
export function transformHistoryData(history: HAHistoryRecord[], prefix = 'air1'): TimeSeriesDataPoint[] {
  return history.map((record) => {
    const sensorType = extractSensorType(record.entity_id, record.attributes, prefix);

    // Parse numeric value from state
    let value: number | null = null;
    const numericValue = Number.parseFloat(record.state);
    if (!Number.isNaN(numericValue)) {
      value = numericValue;
    }

    // Get unit
    let unit: string | null = null;
    if (record.attributes.unit_of_measurement && typeof record.attributes.unit_of_measurement === 'string') {
      unit = record.attributes.unit_of_measurement;
    }

    // Temperature conversion (same as above)
    if (sensorType === 'temperature' && value !== null && unit === '°F') {
      value = Math.round((((value - 32) * 5) / 9) * 100) / 100;
      unit = '°C';
    }

    return {
      timestamp: record.last_updated,
      value,
      state: record.state,
      attributes: record.attributes,
    };
  });
}

/**
 * Test connection to Home Assistant API
 * @returns True if connection successful
 */
export async function testConnection(): Promise<boolean> {
  try {
    console.log('[HA Client] Testing connection to Home Assistant API');

    await haFetch<{ message?: string }>('/');

    console.log('[HA Client] Connection successful');
    return true;
  } catch (error: unknown) {
    console.error('[HA Client] Connection test failed:', getErrorMessage(error));
    return false;
  }
}

/**
 * Get Home Assistant configuration
 * @returns HA config object
 */
export async function fetchConfig(): Promise<unknown> {
  try {
    console.log('[HA Client] Fetching Home Assistant configuration');

    const config = await haFetch<unknown>('/config');

    return config;
  } catch (error: unknown) {
    console.error('[HA Client] Error fetching config:', getErrorMessage(error));
    throw new Error(`Failed to fetch HA config: ${getErrorMessage(error)}`);
  }
}

export default {
  fetchSensors,
  fetchState,
  fetchHistory,
  transformEntityToSensorData,
  transformHistoryData,
  testConnection,
  fetchConfig,
};
