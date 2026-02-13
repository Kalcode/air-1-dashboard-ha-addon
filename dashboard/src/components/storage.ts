import * as StorageAPI from './storage-api';
import type { Reading, SensorData } from './types';

// Save a new reading to the server
export async function saveReading(data: Partial<SensorData>, room: string): Promise<Reading[]> {
  const timestamp = Date.now();

  await StorageAPI.saveReading({
    data: data as Record<string, string>,
    room: room || '',
    timestamp,
  });

  // Fetch latest readings to return
  return await loadHistory();
}

// Load reading history from the server
export async function loadHistory(): Promise<Reading[]> {
  try {
    return await StorageAPI.getReadings({ limit: 50 });
  } catch (error) {
    console.error('Failed to load history:', error);
    return [];
  }
}

// Delete a specific reading
export async function deleteReading(id: string): Promise<Reading[]> {
  try {
    await StorageAPI.deleteReading(id);
    return await loadHistory();
  } catch (error) {
    console.error('Failed to delete reading:', error);
    throw error;
  }
}

// Clear all storage
export async function clearAllStorage(): Promise<void> {
  try {
    await StorageAPI.clearAllReadings();
  } catch (error) {
    console.error('Failed to clear storage:', error);
    throw error;
  }
}

// Export history as JSON file download
export async function exportHistory(): Promise<void> {
  try {
    const exportData = await StorageAPI.exportReadings();
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `air-quality-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export history:', error);
    throw error;
  }
}

// Import readings from a JSON file
export async function importHistory(file: File): Promise<Reading[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result as string);

        // Handle both old format (array) and new format (export object)
        const readings: unknown[] = [];
        if (Array.isArray(data)) {
          readings.push(...data);
        } else if (data.readings && Array.isArray(data.readings)) {
          readings.push(...data.readings);
        } else {
          reject(new Error('Invalid format: expected an array or export object'));
          return;
        }

        // Import to server
        const result = await StorageAPI.importReadings(readings as never[]);

        if (result.errors > 0) {
          console.warn(`Import completed with ${result.errors} errors`);
        }

        // Fetch updated history
        const history = await loadHistory();
        resolve(history);
      } catch (error) {
        reject(new Error('Could not parse or import JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
