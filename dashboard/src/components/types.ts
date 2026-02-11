export interface SensorData {
	co2: string;
	pm25: string;
	pm10: string;
	pm_1um: string;
	pm_4um: string;
	humidity: string;
	temperature: string;
	voc: string;
	vocQuality: string;
	nox: string;
	pressure: string;
	rssi: string;
	uptime: string;
}

export interface ThresholdTier {
	max: number;
	label: string;
	color: string;
	advice?: string;
}

export interface ThresholdResult extends ThresholdTier {
	value: number;
}

export interface Reading {
	id: string;
	data: SensorData;
	room: string;
	timestamp: number;
	time: string;
	date: string;
}

export interface SharePayload {
	label: string;
	readings: Reading[];
}

// Home Assistant integration types
export interface HAEntity {
	entity_id: string;
	state: string;
	attributes: Record<string, any>;
	last_changed: string;
	last_updated: string;
}

export interface HAConfig {
	sensor_prefix: string;
	history_days: number;
	update_interval: number;
}

export interface SensorOption {
	entity_id: string;
	friendly_name: string;
	room?: string;
	device_name?: string;
}

export interface DataSourceConfig {
	mode: "ha-auto";
	selectedEntity?: string;
	pollInterval: number;
}
