/**
 * Browser-local FL data storage facade.
 *
 * Reusable IoT aggregation, mock data generation, and tensor preparation live in
 * @edgechain/fl. This file keeps only web-app localStorage behavior.
 */

import {
  calculateDatasetStats,
  dataPointToTensor,
  encodeCategorical,
  generateMockFarmDataset,
  generateSampleData,
  aggregateIoTReadings,
  iotDataToTrainingPoint,
  normalizeFeature,
  predictionInputToTensor,
  prepareTrainingData,
  simulateIoTSensorStream,
  validateDataPoint,
  type FarmDataset,
  type IoTSensorReading,
} from '@edgechain/fl';

export {
  aggregateIoTReadings,
  calculateDatasetStats,
  dataPointToTensor,
  encodeCategorical,
  generateMockFarmDataset,
  generateSampleData,
  iotDataToTrainingPoint,
  normalizeFeature,
  predictionInputToTensor,
  prepareTrainingData,
  simulateIoTSensorStream,
  validateDataPoint,
};

export type { IoTAggregatedData, IoTSensorReading } from '@edgechain/fl';

const STORAGE_KEY = 'edgechain_farm_dataset';
const IOT_READINGS_KEY = 'edgechain_iot_readings';

/**
 * Save dataset to browser localStorage.
 * Data never leaves the farmer's device through this helper.
 */
export function saveDatasetLocally(dataset: FarmDataset): void {
  try {
    const serialized = JSON.stringify(dataset);
    localStorage.setItem(STORAGE_KEY, serialized);
    console.log(`Saved ${dataset.totalSamples} data points locally (IoT-based)`);
  } catch (error) {
    console.error('Failed to save dataset:', error);
    throw new Error('Failed to save dataset to local storage');
  }
}

export function loadDatasetLocally(): FarmDataset | null {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) return null;

    const dataset = JSON.parse(serialized) as FarmDataset;
    console.log(`Loaded ${dataset.totalSamples} IoT-based data points`);
    return dataset;
  } catch (error) {
    console.error('Failed to load dataset:', error);
    return null;
  }
}

export function saveIoTReadings(readings: IoTSensorReading[]): void {
  try {
    const serialized = JSON.stringify(readings);
    localStorage.setItem(IOT_READINGS_KEY, serialized);
    console.log(`Saved ${readings.length} IoT sensor readings`);
  } catch (error) {
    console.error('Failed to save IoT readings:', error);
  }
}

export function loadIoTReadings(): IoTSensorReading[] {
  try {
    const serialized = localStorage.getItem(IOT_READINGS_KEY);
    if (!serialized) return [];

    return JSON.parse(serialized) as IoTSensorReading[];
  } catch (error) {
    console.error('Failed to load IoT readings:', error);
    return [];
  }
}

export function clearAllLocalData(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(IOT_READINGS_KEY);
  console.log('Cleared all local IoT data');
}
