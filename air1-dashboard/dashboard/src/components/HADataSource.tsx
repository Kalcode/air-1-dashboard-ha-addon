import { For, Show, createEffect, createSignal, onCleanup } from 'solid-js';
import { API_BASE_URL } from '../config';
import type { HAConfig, HAEntity, SensorData, SensorOption } from './types';

interface HADataSourceProps {
  onDataUpdate: (data: Partial<SensorData>, room: string) => void;
  onError: (error: string) => void;
  pausePolling?: boolean; // Pause auto-updates when viewing history
}

interface DeviceResponse {
  entity_id?: string;
  device_id?: string;
  friendly_name?: string;
  device_name?: string;
  room?: string;
  co2?: number;
  pm25?: number;
  temperature?: number;
  humidity?: number;
  voc?: number;
  nox?: number;
  rssi?: number;
  uptime?: number;
}

export default function HADataSource(props: HADataSourceProps) {
  const [sensors, setSensors] = createSignal<SensorOption[]>([]);
  const [selectedSensor, setSelectedSensor] = createSignal<string | null>(null);
  const [config, setConfig] = createSignal<HAConfig | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [connected, setConnected] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [lastUpdate, setLastUpdate] = createSignal<Date | null>(null);

  // Load selected sensor from localStorage
  const loadSelectedSensor = () => {
    try {
      const saved = localStorage.getItem('ha_selected_sensor');
      if (saved) {
        setSelectedSensor(saved);
      }
    } catch (err) {
      console.error('Failed to load selected sensor:', err);
    }
  };

  // Save selected sensor to localStorage
  const saveSelectedSensor = (entityId: string) => {
    try {
      localStorage.setItem('ha_selected_sensor', entityId);
      setSelectedSensor(entityId);
    } catch (err) {
      console.error('Failed to save selected sensor:', err);
    }
  };

  // Fetch config from API
  const fetchConfig = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}api/config`);
      if (!response.ok) {
        throw new Error(`Failed to fetch config: ${response.status}`);
      }
      const json = await response.json();
      setConfig(json.data); // Extract the 'data' property from response
      return json.data;
    } catch (err) {
      console.error('Config fetch error:', err);
      props.onError(`Failed to load configuration: ${(err as Error).message}`);
      throw err;
    }
  };

  // Fetch available sensors
  const fetchSensors = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}api/sensors`);
      if (!response.ok) {
        throw new Error(`Failed to fetch sensors: ${response.status}`);
      }
      const data = await response.json();
      if (data.devices && Array.isArray(data.devices)) {
        const sensorList: SensorOption[] = data.devices.map((device: DeviceResponse) => ({
          entity_id: device.entity_id || device.device_id || '',
          friendly_name: device.friendly_name || device.device_name || '',
          room: device.room,
          device_name: device.device_name,
        }));
        setSensors(sensorList);

        // Auto-select if only one sensor or if previously selected exists
        if (sensorList.length === 1 && sensorList[0]) {
          saveSelectedSensor(sensorList[0].entity_id);
        } else if (selectedSensor()) {
          const exists = sensorList.find((s) => s.entity_id === selectedSensor());
          if (!exists && sensorList.length > 0) {
            // Previously selected sensor not found, clear selection
            setSelectedSensor(null);
            localStorage.removeItem('ha_selected_sensor');
          }
        }
      }
      setConnected(true);
      setError(null);
    } catch (err) {
      console.error('Sensor fetch error:', err);
      setConnected(false);
      const errorMsg = `Failed to discover sensors: ${(err as Error).message}`;
      setError(errorMsg);
      props.onError(errorMsg);
    }
  };

  // Fetch current sensor data for the selected device
  const fetchData = async () => {
    const entityId = selectedSensor();
    if (!entityId) return;

    try {
      const response = await fetch(`${API_BASE_URL}api/sensors`);
      if (!response.ok) {
        throw new Error(`Failed to fetch sensor data: ${response.status}`);
      }
      const data = await response.json();

      // Find the selected device in the response
      const device = data.devices?.find((d: DeviceResponse) => d.entity_id === entityId);

      if (!device) {
        throw new Error(`Device ${entityId} not found in response`);
      }

      // Transform device data to SensorData format
      const sensorData: Partial<SensorData> = {
        co2: device.co2?.toString() || '',
        pm25: device.pm25?.toString() || '',
        pm10: device.pm10?.toString() || '',
        pm_1um: device.pm_1um?.toString() || '',
        pm_4um: device.pm_4um?.toString() || '',
        humidity: device.humidity?.toString() || '',
        temperature: device.temperature?.toString() || '',
        voc: device.voc?.toString() || '',
        vocQuality: device.vocQuality || '',
        nox: device.nox?.toString() || '',
        pressure: device.pressure?.toString() || '',
        rssi: device.rssi?.toString() || '',
        uptime: device.uptime || '',
      };

      const room = device.room || device.device_name || 'Unknown';

      props.onDataUpdate(sensorData, room);
      setLastUpdate(new Date());
      setConnected(true);
      setError(null);
    } catch (err) {
      console.error('Sensor data fetch error:', err);
      setConnected(false);
      const errorMsg = `Failed to fetch sensor data: ${(err as Error).message}`;
      setError(errorMsg);
      props.onError(errorMsg);
    }
  };

  // Initialize: load config and sensors
  createEffect(async () => {
    setLoading(true);
    loadSelectedSensor();
    try {
      await fetchConfig();
      await fetchSensors();
    } finally {
      setLoading(false);
    }
  });

  // Set up polling when sensor is selected
  createEffect(() => {
    const entityId = selectedSensor();
    const cfg = config();
    if (!entityId || !cfg) return;

    // Skip polling if paused (e.g., when viewing history)
    if (props.pausePolling) {
      return;
    }

    // Fetch immediately
    fetchData();

    // Set up polling interval
    const interval = setInterval(() => {
      fetchData();
    }, cfg.update_interval * 1000);

    onCleanup(() => clearInterval(interval));
  });

  const handleSensorChange = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    saveSelectedSensor(target.value);
  };

  const refreshNow = async () => {
    await fetchData();
  };

  return (
    <div class="ha-data-source">
      <Show when={loading()}>
        <div
          style={{
            padding: '1rem',
            'text-align': 'center',
            color: '#94a3b8',
          }}
        >
          Loading configuration...
        </div>
      </Show>

      <Show when={!loading() && error()}>
        <div
          style={{
            padding: '1rem',
            'background-color': '#dc262644',
            border: '1px solid #dc2626',
            'border-radius': '8px',
            color: '#fca5a5',
            'margin-bottom': '1rem',
          }}
        >
          <strong>Error:</strong> {error()}
          <button
            type="button"
            onClick={fetchSensors}
            style={{
              'margin-left': '1rem',
              padding: '0.25rem 0.75rem',
              'background-color': '#dc2626',
              color: 'white',
              border: 'none',
              'border-radius': '4px',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      </Show>

      <Show when={!loading() && !error() && sensors().length === 0}>
        <div
          style={{
            padding: '1rem',
            'background-color': '#f59e0b44',
            border: '1px solid #f59e0b',
            'border-radius': '8px',
            color: '#fbbf24',
            'margin-bottom': '1rem',
          }}
        >
          No air quality sensors found. Make sure your Apollo AIR-1 sensors are configured in Home Assistant with the
          prefix "{config()?.sensor_prefix || 'air1'}
          ".
        </div>
      </Show>

      <Show when={!loading() && !error() && sensors().length > 0}>
        <div
          style={{
            display: 'flex',
            'align-items': 'center',
            gap: '1rem',
            'margin-bottom': '1rem',
          }}
        >
          <Show when={sensors().length > 1}>
            <div style={{ flex: 1 }}>
              <label for="sensor-select" style={{ display: 'block', 'margin-bottom': '0.5rem', color: '#cbd5e1' }}>
                Select Sensor:
              </label>
              <select
                id="sensor-select"
                value={selectedSensor() || ''}
                onChange={handleSensorChange}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  'background-color': '#1e293b',
                  color: '#e2e8f0',
                  border: '1px solid #475569',
                  'border-radius': '6px',
                  'font-size': '1rem',
                }}
              >
                <option value="">-- Choose a sensor --</option>
                <For each={sensors()}>
                  {(sensor) => (
                    <option value={sensor.entity_id}>
                      {sensor.friendly_name?.split(sensors()[0]?.entity_id || '  ')?.[0] || sensor.entity_id}
                      {sensor.room && ` (${sensor.room})`}
                    </option>
                  )}
                </For>
              </select>
            </div>
          </Show>

          <Show when={sensors().length === 1 && selectedSensor()}>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#94a3b8', 'font-size': '0.875rem' }}>Connected to:</div>
              <div style={{ color: '#e2e8f0', 'font-weight': '500' }}>Apollo AIR-1 {sensors()[0]?.entity_id}</div>
            </div>
          </Show>

          <div
            style={{
              display: 'flex',
              'align-items': 'center',
              gap: '0.5rem',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                'border-radius': '50%',
                'background-color': connected() ? '#22c55e' : '#64748b',
              }}
              title={connected() ? 'Connected' : 'Disconnected'}
            />
            <Show when={lastUpdate()}>
              <span style={{ color: '#64748b', 'font-size': '0.75rem' }}>
                Updated {lastUpdate()?.toLocaleTimeString()}
              </span>
            </Show>
            <Show when={selectedSensor()}>
              <button
                type="button"
                onClick={refreshNow}
                style={{
                  padding: '0.25rem 0.75rem',
                  'background-color': '#3b82f6',
                  color: 'white',
                  border: 'none',
                  'border-radius': '4px',
                  cursor: 'pointer',
                  'font-size': '0.75rem',
                }}
              >
                Refresh
              </button>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  );
}
