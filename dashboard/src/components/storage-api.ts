import { API_BASE_URL } from '../config';
import type { Reading } from './types';

interface StorageReading {
  id: string;
  device_id: string | null;
  room: string;
  timestamp: number;
  created_at: string;
  data: Record<string, string>;
}

interface StorageResponse {
  readings: StorageReading[];
  pagination: {
    limit: number;
    offset: number;
    count: number;
  };
}

interface ExportData {
  export_date: string;
  version: string;
  readings: StorageReading[];
}

interface ImportResponse {
  success: boolean;
  imported: number;
  errors: number;
  total: number;
}

interface StatsResponse {
  total_readings: number;
  oldest_timestamp: number | null;
  newest_timestamp: number | null;
  devices: string[];
  rooms: string[];
  database_path: string;
}

const API_BASE = `${API_BASE_URL}api/storage`;

/**
 * Get readings with pagination and filtering
 */
export async function getReadings(
  options: {
    limit?: number;
    offset?: number;
    device_id?: string;
    room?: string;
    since?: number;
  } = {},
): Promise<Reading[]> {
  const params = new URLSearchParams();

  if (options.limit !== undefined) params.set('limit', options.limit.toString());
  if (options.offset !== undefined) params.set('offset', options.offset.toString());
  if (options.device_id) params.set('device_id', options.device_id);
  if (options.room) params.set('room', options.room);
  if (options.since !== undefined) params.set('since', options.since.toString());

  const url = `${API_BASE}/readings?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch readings: ${response.statusText}`);
  }

  const data: StorageResponse = await response.json();

  // Convert storage format to Reading format
  // Note: Type assertion needed because storage format uses Record<string, string>
  // while Reading type expects SensorData
  return data.readings.map((r) => {
    const date = new Date(r.timestamp);
    return {
      id: r.id,
      data: r.data as unknown as Reading['data'],
      room: r.room,
      timestamp: r.timestamp,
      time: date.toLocaleTimeString(),
      date: date.toLocaleDateString(),
    };
  }) as Reading[];
}

/**
 * Store a new reading
 */
export async function saveReading(reading: {
  data: Record<string, string>;
  room: string;
  device_id?: string;
  timestamp?: number;
}): Promise<{ id: string; timestamp: number }> {
  const response = await fetch(`${API_BASE}/readings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(reading),
  });

  if (!response.ok) {
    throw new Error(`Failed to save reading: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Delete a specific reading
 */
export async function deleteReading(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/readings/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete reading: ${response.statusText}`);
  }
}

/**
 * Clear all readings
 */
export async function clearAllReadings(): Promise<void> {
  const response = await fetch(`${API_BASE}/readings`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to clear readings: ${response.statusText}`);
  }
}

/**
 * Export all readings
 */
export async function exportReadings(): Promise<ExportData> {
  const response = await fetch(`${API_BASE}/export`);

  if (!response.ok) {
    throw new Error(`Failed to export readings: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Import readings
 */
export async function importReadings(readings: StorageReading[]): Promise<ImportResponse> {
  const response = await fetch(`${API_BASE}/import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ readings }),
  });

  if (!response.ok) {
    throw new Error(`Failed to import readings: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get database statistics
 */
export async function getStats(): Promise<StatsResponse> {
  const response = await fetch(`${API_BASE}/stats`);

  if (!response.ok) {
    throw new Error(`Failed to fetch stats: ${response.statusText}`);
  }

  return response.json();
}
