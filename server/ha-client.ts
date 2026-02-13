/**
 * Home Assistant API Client
 *
 * Handles all API interactions with Home Assistant Supervisor
 */

import axios, { type AxiosInstance, type AxiosError } from 'axios';
import { extractSensorType, getDeviceName, parseEntityId } from './config';
import type { HAEntity, HAHistoryRecord, SensorData, SensorType, TimeSeriesDataPoint } from './types';

/**
 * Type guard for Axios errors
 */
function isAxiosError(error: unknown): error is AxiosError {
  return axios.isAxiosError(error);
}

/**
 * Safely extract error message from unknown error type
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

const HA_API_BASE = process.env.HA_API_BASE || 'http://supervisor/core/api';
const SUPERVISOR_TOKEN = process.env.SUPERVISOR_TOKEN;

// Create axios instance with default config
const haClient: AxiosInstance = axios.create({
  baseURL: HA_API_BASE,
  headers: {
    Authorization: `Bearer ${SUPERVISOR_TOKEN}`,
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

/**
 * Fetch all sensors matching the prefix
 * @param prefix - Sensor prefix (e.g., "air1")
 * @returns Array of sensor entities
 */
export async function fetchSensors(prefix = 'air1'): Promise<HAEntity[]> {
  try {
    console.log(`[HA Client] Fetching sensors with prefix: ${prefix}`);

    const response = await haClient.get<HAEntity[]>('/states');
    const states = response.data;

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

    if (isAxiosError(error) && error.response) {
      console.error('[HA Client] Response status:', error.response.status);
      console.error('[HA Client] Response data:', error.response.data);
    }

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

    const response = await haClient.get<HAEntity>(`/states/${entityId}`);

    return response.data;
  } catch (error: unknown) {
    console.error(`[HA Client] Error fetching state for ${entityId}:`, getErrorMessage(error));

    if (isAxiosError(error) && error.response) {
      if (error.response.status === 404) {
        throw new Error(`Entity not found: ${entityId}`);
      }
      console.error('[HA Client] Response status:', error.response.status);
      console.error('[HA Client] Response data:', error.response.data);
    }

    throw new Error(`Failed to fetch state: ${getErrorMessage(error)}`);
  }
}

/**
 * Fetch historical data for an entity
 * @param entityId - Entity ID
 * @param start - ISO timestamp for start (optional)
 * @param end - ISO timestamp for end (optional)
 * @returns Array of historical state changes
 */
export async function fetchHistory(
  entityId: string,
  start: string | null = null,
  end: string | null = null,
): Promise<HAHistoryRecord[]> {
  try {
    // If no start time provided, default to 24 hours ago
    const startTime = start || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const endTime = end || new Date().toISOString();

    console.log(`[HA Client] Fetching history for ${entityId} from ${startTime} to ${endTime}`);

    // HA history API endpoint format: /history/period/{start_time}?filter_entity_id={entity_id}&end_time={end_time}
    const params = new URLSearchParams({
      filter_entity_id: entityId,
      end_time: endTime,
    });

    const url = `/history/period/${startTime}?${params.toString()}`;
    const response = await haClient.get<HAHistoryRecord[][]>(url);

    // History API returns array of arrays (one array per entity)
    const historyData = response.data;

    if (!historyData || historyData.length === 0) {
      console.log(`[HA Client] No history data found for ${entityId}`);
      return [];
    }

    // Get the first (and should be only) entity's history
    const entityHistory = historyData[0] || [];

    console.log(`[HA Client] Retrieved ${entityHistory.length} history records`);

    return entityHistory;
  } catch (error: unknown) {
    console.error(`[HA Client] Error fetching history for ${entityId}:`, getErrorMessage(error));

    if (isAxiosError(error) && error.response) {
      console.error('[HA Client] Response status:', error.response.status);
      console.error('[HA Client] Response data:', error.response.data);
    }

    throw new Error(`Failed to fetch history: ${getErrorMessage(error)}`);
  }
}

/**
 * Transform Home Assistant entity to SensorData format
 * @param entity - HA entity object
 * @param prefix - Sensor prefix
 * @returns Transformed sensor data
 */
function transformEntity(entity: HAEntity, prefix = 'air1'): SensorData {
  const { device, sensor } = parseEntityId(entity.entity_id, prefix);
  const sensorType = extractSensorType(entity.entity_id, entity.attributes, prefix);

  // Parse state value
  let value: number | null = null;
  let unit = entity.attributes?.unit_of_measurement || null;
  if (entity.state && entity.state !== 'unknown' && entity.state !== 'unavailable') {
    const parsed = Number.parseFloat(entity.state);
    if (!Number.isNaN(parsed)) {
      value = parsed;
    }
  }

  // CRITICAL: Convert Fahrenheit to Celsius for temperature sensors
  // This is the primary temperature conversion logic that must be preserved exactly
  if (sensorType === 'temperature' && value !== null && unit === '°F') {
    const beforeConvert = value;
    value = Math.round((((value - 32) * 5) / 9) * 100) / 100;
    unit = '°C';
    console.log(`[HA Client] Converted temperature from °F to °C: ${beforeConvert}°F → ${value}°C`);
  }

  // CRITICAL: Apply calibration offset after unit conversion (offset is in °C)
  // Example: 75.5°F → 24.17°C, then + 2°C offset = 26.17°C
  if (value !== null && entity._offset != null) {
    const before = value;
    value = Math.round((value + entity._offset) * 100) / 100;
    console.log(
      `[HA Client] Applied offset ${entity._offset}°C to ${entity.entity_id}: ${before}°C → ${value}°C (from ${entity._offset_entity})`,
    );
  }

  return {
    entity_id: entity.entity_id,
    device: device,
    device_name: getDeviceName(device),
    sensor: sensor,
    sensor_type: sensorType,
    value: value,
    unit: unit,
    state: entity.state,
    friendly_name: entity.attributes?.friendly_name || entity.entity_id,
    device_class: entity.attributes?.device_class || null,
    last_updated: entity.last_updated,
    last_changed: entity.last_changed,
    attributes: entity.attributes || {},
  };
}

/**
 * Transform array of HA entities to SensorData format
 * @param entities - Array of HA entity objects
 * @param prefix - Sensor prefix
 * @returns Array of transformed sensor data
 */
export function transformEntityToSensorData(entities: HAEntity[], prefix = 'air1'): SensorData[] {
  if (!Array.isArray(entities)) {
    console.error('[HA Client] transformEntityToSensorData received non-array input');
    return [];
  }

  return entities.map((entity) => transformEntity(entity, prefix));
}

/**
 * Transform historical data to time-series format
 * @param historyData - Array of history records from HA
 * @returns Array of { timestamp, value } objects
 */
export function transformHistoryData(historyData: HAHistoryRecord[]): TimeSeriesDataPoint[] {
  if (!Array.isArray(historyData)) {
    console.error('[HA Client] transformHistoryData received non-array input');
    return [];
  }

  return historyData
    .map((record) => {
      // Parse state value
      let value: number | null = null;
      if (record.state && record.state !== 'unknown' && record.state !== 'unavailable') {
        const parsed = Number.parseFloat(record.state);
        if (!Number.isNaN(parsed)) {
          value = parsed;
        }
      }

      return {
        timestamp: record.last_updated,
        value: value,
        state: record.state,
        attributes: record.attributes || {},
      };
    })
    .filter((record) => record.value !== null); // Filter out invalid records
}

/**
 * Test connection to Home Assistant API
 * @returns True if connection successful
 */
export async function testConnection(): Promise<boolean> {
  try {
    console.log('[HA Client] Testing connection to Home Assistant API');

    const response = await haClient.get<{ message?: string }>('/');

    console.log('[HA Client] Connection successful:', response.data?.message);
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

    const response = await haClient.get('/config');

    return response.data;
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
