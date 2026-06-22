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
 *
 * IoTDashboard writes a short-lived bundle here immediately before navigating
 * into the FL training flow. This module deliberately keeps no hardware or BLE
 * dependencies; it only bridges the UI route handoff.
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

/**
 * Remove the route-handoff bundle after it has been consumed for training.
 * Clearing eagerly reduces the chance of accidentally reusing stale readings.
 */
export function clearSensorNodeData(): void {
  localStorage.removeItem('sensor_node_data');
  console.log('Cleared Sensor Node data');
}

/**
 * Minimum viable guard for training readiness.
 *
 * The threshold is intentionally low for the prototype; production validation
 * should check sampling windows, sensor health, and per-feature completeness.
 */
export function hasValidSensorNodeData(): boolean {
  const bundle = loadSensorNodeData();
  return bundle !== null && bundle.sensorData.length >= 5;
}
