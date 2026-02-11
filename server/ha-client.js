/**
 * Home Assistant API Client
 *
 * Handles all API interactions with Home Assistant Supervisor
 */

import axios from 'axios';
import { extractSensorType, parseEntityId, getDeviceName } from './config.js';

const HA_API_BASE = process.env.HA_API_BASE || 'http://supervisor/core/api';
const SUPERVISOR_TOKEN = process.env.SUPERVISOR_TOKEN;

// Create axios instance with default config
const haClient = axios.create({
  baseURL: HA_API_BASE,
  headers: {
    'Authorization': `Bearer ${SUPERVISOR_TOKEN}`,
    'Content-Type': 'application/json'
  },
  timeout: 30000 // 30 second timeout
});

/**
 * Fetch all sensors matching the prefix
 * @param {string} prefix - Sensor prefix (e.g., "air1")
 * @returns {Promise<Array>} - Array of sensor entities
 */
export async function fetchSensors(prefix = 'air1') {
  try {
    console.log(`[HA Client] Fetching sensors with prefix: ${prefix}`);

    const response = await haClient.get('/states');
    const states = response.data;

    // Filter for sensors matching the prefix
    const pattern = new RegExp(`^sensor\\.${prefix}_`, 'i');
    const matchingSensors = states.filter(entity => pattern.test(entity.entity_id));

    console.log(`[HA Client] Found ${matchingSensors.length} matching sensors`);

    return matchingSensors;
  } catch (error) {
    console.error('[HA Client] Error fetching sensors:', error.message);

    if (error.response) {
      console.error('[HA Client] Response status:', error.response.status);
      console.error('[HA Client] Response data:', error.response.data);
    }

    throw new Error(`Failed to fetch sensors: ${error.message}`);
  }
}

/**
 * Fetch current state for a specific entity
 * @param {string} entityId - Entity ID (e.g., "sensor.air1_bedroom_pm25")
 * @returns {Promise<object>} - Entity state object
 */
export async function fetchState(entityId) {
  try {
    console.log(`[HA Client] Fetching state for entity: ${entityId}`);

    const response = await haClient.get(`/states/${entityId}`);

    return response.data;
  } catch (error) {
    console.error(`[HA Client] Error fetching state for ${entityId}:`, error.message);

    if (error.response) {
      if (error.response.status === 404) {
        throw new Error(`Entity not found: ${entityId}`);
      }
      console.error('[HA Client] Response status:', error.response.status);
      console.error('[HA Client] Response data:', error.response.data);
    }

    throw new Error(`Failed to fetch state: ${error.message}`);
  }
}

/**
 * Fetch historical data for an entity
 * @param {string} entityId - Entity ID
 * @param {string} start - ISO timestamp for start (optional)
 * @param {string} end - ISO timestamp for end (optional)
 * @returns {Promise<Array>} - Array of historical state changes
 */
export async function fetchHistory(entityId, start = null, end = null) {
  try {
    // If no start time provided, default to 24 hours ago
    const startTime = start || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const endTime = end || new Date().toISOString();

    console.log(`[HA Client] Fetching history for ${entityId} from ${startTime} to ${endTime}`);

    // HA history API endpoint format: /history/period/{start_time}?filter_entity_id={entity_id}&end_time={end_time}
    const params = new URLSearchParams({
      filter_entity_id: entityId,
      end_time: endTime
    });

    const url = `/history/period/${startTime}?${params.toString()}`;
    const response = await haClient.get(url);

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
  } catch (error) {
    console.error(`[HA Client] Error fetching history for ${entityId}:`, error.message);

    if (error.response) {
      console.error('[HA Client] Response status:', error.response.status);
      console.error('[HA Client] Response data:', error.response.data);
    }

    throw new Error(`Failed to fetch history: ${error.message}`);
  }
}

/**
 * Transform Home Assistant entity to SensorData format
 * @param {object} entity - HA entity object
 * @param {string} prefix - Sensor prefix
 * @returns {object} - Transformed sensor data
 */
function transformEntity(entity, prefix = 'air1') {
  const { device, sensor } = parseEntityId(entity.entity_id, prefix);
  const sensorType = extractSensorType(entity.entity_id, entity.attributes, prefix);

  // Parse state value
  let value = null;
  if (entity.state && entity.state !== 'unknown' && entity.state !== 'unavailable') {
    const parsed = parseFloat(entity.state);
    if (!isNaN(parsed)) {
      value = parsed;
    }
  }

  return {
    entity_id: entity.entity_id,
    device: device,
    device_name: getDeviceName(device),
    sensor: sensor,
    sensor_type: sensorType,
    value: value,
    unit: entity.attributes?.unit_of_measurement || null,
    state: entity.state,
    friendly_name: entity.attributes?.friendly_name || entity.entity_id,
    device_class: entity.attributes?.device_class || null,
    last_updated: entity.last_updated,
    last_changed: entity.last_changed,
    attributes: entity.attributes || {}
  };
}

/**
 * Transform array of HA entities to SensorData format
 * @param {Array} entities - Array of HA entity objects
 * @param {string} prefix - Sensor prefix
 * @returns {Array} - Array of transformed sensor data
 */
export function transformEntityToSensorData(entities, prefix = 'air1') {
  if (!Array.isArray(entities)) {
    console.error('[HA Client] transformEntityToSensorData received non-array input');
    return [];
  }

  return entities.map(entity => transformEntity(entity, prefix));
}

/**
 * Transform historical data to time-series format
 * @param {Array} historyData - Array of history records from HA
 * @returns {Array} - Array of { timestamp, value } objects
 */
export function transformHistoryData(historyData) {
  if (!Array.isArray(historyData)) {
    console.error('[HA Client] transformHistoryData received non-array input');
    return [];
  }

  return historyData
    .map(record => {
      // Parse state value
      let value = null;
      if (record.state && record.state !== 'unknown' && record.state !== 'unavailable') {
        const parsed = parseFloat(record.state);
        if (!isNaN(parsed)) {
          value = parsed;
        }
      }

      return {
        timestamp: record.last_updated,
        value: value,
        state: record.state,
        attributes: record.attributes || {}
      };
    })
    .filter(record => record.value !== null); // Filter out invalid records
}

/**
 * Test connection to Home Assistant API
 * @returns {Promise<boolean>} - True if connection successful
 */
export async function testConnection() {
  try {
    console.log('[HA Client] Testing connection to Home Assistant API');

    const response = await haClient.get('/');

    console.log('[HA Client] Connection successful:', response.data?.message);
    return true;
  } catch (error) {
    console.error('[HA Client] Connection test failed:', error.message);
    return false;
  }
}

/**
 * Get Home Assistant configuration
 * @returns {Promise<object>} - HA config object
 */
export async function fetchConfig() {
  try {
    console.log('[HA Client] Fetching Home Assistant configuration');

    const response = await haClient.get('/config');

    return response.data;
  } catch (error) {
    console.error('[HA Client] Error fetching config:', error.message);
    throw new Error(`Failed to fetch HA config: ${error.message}`);
  }
}

export default {
  fetchSensors,
  fetchState,
  fetchHistory,
  transformEntityToSensorData,
  transformHistoryData,
  testConnection,
  fetchConfig
};
