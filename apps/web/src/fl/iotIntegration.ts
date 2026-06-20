/**
 * Browser-local Sensor Node integration helpers.
 *
 * Canonical Sensor Node to FL dataset conversion lives in @edgechain/fl.
 */

import {
  convertSensorNodeDataToFLDataset,
  getSensorNodeDataSummary,
  type SensorNodeDataBundle,
} from '@edgechain/fl';

export {
  convertSensorNodeDataToFLDataset,
  getSensorNodeDataSummary,
};

export type {
  FarmMetadata,
  SensorNodeData,
  SensorNodeDataBundle,
} from '@edgechain/fl';

/**
 * Load Sensor Node data from browser localStorage.
 */
export function loadSensorNodeData(): SensorNodeDataBundle | null {
  try {
    const data = localStorage.getItem('sensor_node_data');
    if (!data) return null;

    const bundle = JSON.parse(data) as SensorNodeDataBundle;
    console.log(`Loaded ${bundle.sensorData.length} Sensor Node readings`);
    return bundle;
  } catch (error) {
    console.error('Failed to load Sensor Node data:', error);
    return null;
  }
}

export function clearSensorNodeData(): void {
  localStorage.removeItem('sensor_node_data');
  console.log('Cleared Sensor Node data');
}

export function hasValidSensorNodeData(): boolean {
  const bundle = loadSensorNodeData();
  return bundle !== null && bundle.sensorData.length >= 5;
}
