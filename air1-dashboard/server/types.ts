/**
 * Type Definitions for Air-1 Dashboard Server
 *
 * Comprehensive TypeScript types for Home Assistant API interactions,
 * sensor data, and server configuration.
 */

/**
 * Home Assistant entity state object
 */
export interface HAEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
  context?: {
    id: string;
    parent_id: string | null;
    user_id: string | null;
  };
  // Custom properties added during processing
  _offset?: number;
  _offset_entity?: string;
}

/**
 * Home Assistant entity attributes
 */
export interface HAEntityAttributes {
  unit_of_measurement?: string;
  friendly_name?: string;
  device_class?: string;
  state_class?: string;
  icon?: string;
  [key: string]: unknown;
}

/**
 * Historical state record from HA history API
 */
export interface HAHistoryRecord {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
}

/**
 * Sensor data after transformation from HA entity
 */
export interface SensorData {
  entity_id: string;
  device: string;
  device_name: string;
  sensor: string;
  sensor_type: string | null;
  value: number | null;
  unit: string | null;
  state: string;
  friendly_name: string;
  device_class: string | null;
  last_updated: string;
  last_changed: string;
  attributes: Record<string, unknown>;
}

/**
 * Device object with combined sensor readings
 */
export interface Device {
  entity_id: string;
  device_id: string;
  device_name: string;
  friendly_name: string;
  room: string | null;
  // Sensor readings
  co2?: number;
  pm25?: number;
  pm10?: number;
  pm_1um?: number;
  pm_4um?: number;
  humidity?: number;
  temperature?: number;
  voc?: number;
  vocQuality?: string;
  nox?: number;
  pressure?: number;
  rssi?: number;
  uptime?: string;
}

/**
 * Time-series data point
 */
export interface TimeSeriesDataPoint {
  timestamp: string;
  value: number | null;
  state: string;
  attributes: Record<string, unknown>;
}

/**
 * Parsed entity ID components
 */
export interface ParsedEntityId {
  device: string;
  sensor: string;
}

/**
 * Entity mapping configuration
 */
export interface EntityMappings {
  [key: string]: string[];
}

/**
 * Application configuration
 */
export interface AppConfig {
  sensor_prefix: string;
  update_interval: number;
  history_days: number;
}

/**
 * API response wrapper (success)
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data?: T;
  devices?: Device[];
  count?: number;
  message?: string;
}

/**
 * API response wrapper (error)
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  message?: string;
}

/**
 * API response type (union)
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * History API response data
 */
export interface HistoryResponseData {
  entity_id: string;
  start: string;
  end: string;
  count: number;
  history: TimeSeriesDataPoint[];
}

/**
 * Health check response
 */
export interface HealthResponse {
  status: 'ok';
  timestamp: string;
  config?: {
    sensor_prefix: string;
    update_interval: number;
    history_days: number;
  };
  mode?: 'development' | 'production';
  message?: string;
}

/**
 * Home Assistant API configuration
 */
export interface HAApiConfig {
  baseURL: string;
  headers: {
    Authorization: string;
    'Content-Type': string;
  };
  timeout: number;
}

/**
 * Mock sensor definition (for dev server)
 */
export interface MockSensor {
  entity_id: string;
  friendly_name: string;
  room: string | null;
  device_name: string;
}

/**
 * Mock reading data (for dev server)
 */
export interface MockReading {
  co2: number;
  pm25: number;
  pm10: number;
  pm_1um: number;
  pm_4um: number;
  humidity: number;
  temperature: number | string;
  voc: number;
  vocQuality: string;
  nox: number;
  pressure: number | string;
  rssi: number;
  uptime: string;
  room: string | null;
}

/**
 * Sensor type strings
 */
export type SensorType =
  | 'pm25'
  | 'pm10'
  | 'pm_1um'
  | 'pm_4um'
  | 'co2'
  | 'voc'
  | 'humidity'
  | 'temperature'
  | 'pressure'
  | 'nox'
  | 'rssi';

/**
 * Device class map type
 */
export type DeviceClassMap = {
  [key: string]: SensorType;
};

/**
 * Unit map type
 */
export type UnitMap = {
  [key: string]: SensorType;
};
