/**
 * Arduino IoT Sensor Integration for Federated Learning
 *
 * This module converts Arduino sensor data (temperature, humidity) into
 * training data for the FL crop yield prediction model.
 *
 * Flow:
 * Arduino Sensors → BLE Gateway → Storage → Training Data → FL Model
 */

import type { FarmDataset, FarmDataPoint } from './types';

/**
 * Arduino sensor reading from storage
 */
export interface ArduinoSensorData {
  timestamp: number;
  temperature: number; // °C
  humidity: number; // %
  source: 'arduino' | 'simulated';
}

/**
 * Farm metadata to combine with sensor data
 */
export interface FarmMetadata {
  cropType: string;
  soilType: string;
  irrigationType: string;
  farmSize: number;
  fertilizer: number;
  pesticides: number;
}

/**
 * Stored Arduino data bundle
 */
export interface ArduinoDataBundle {
  sensorData: ArduinoSensorData[];
  averages: {
    temperature: number;
    humidity: number;
    readings: number;
  };
  farmMetadata: FarmMetadata;
  timestamp: number;
}

/**
 * Load Arduino sensor data from localStorage
 */
export function loadArduinoSensorData(): ArduinoDataBundle | null {
  try {
    const data = localStorage.getItem('arduino_sensor_data');
    if (!data) return null;

    const bundle = JSON.parse(data) as ArduinoDataBundle;
    console.log(`📡 Loaded ${bundle.sensorData.length} Arduino sensor readings`);
    return bundle;
  } catch (error) {
    console.error('Failed to load Arduino sensor data:', error);
    return null;
  }
}

/**
 * Clear Arduino sensor data from storage
 */
export function clearArduinoSensorData(): void {
  localStorage.removeItem('arduino_sensor_data');
  console.log('🗑️ Cleared Arduino sensor data');
}

/**
 * Convert Arduino sensor data to FL training dataset
 *
 * Strategy:
 * - Use temperature and humidity from Arduino sensors
 * - Estimate rainfall from humidity patterns (higher humidity = more rain)
 * - Combine with farm metadata (soil, irrigation, fertilizer)
 * - Generate realistic yield predictions based on conditions
 *
 * @param bundle - Arduino data bundle
 * @param farmerId - Midnight wallet address
 * @param numSeasons - Number of historical seasons to simulate
 */
export function convertArduinoDataToFLDataset(
  bundle: ArduinoDataBundle,
  farmerId: string,
  numSeasons: number = 20
): FarmDataset {
  const { averages, farmMetadata, sensorData } = bundle;
  const dataPoints: FarmDataPoint[] = [];

  console.log('🔄 Converting Arduino sensor data to FL training dataset...');
  console.log(`   Temperature: ${averages.temperature.toFixed(1)}°C`);
  console.log(`   Humidity: ${averages.humidity.toFixed(1)}%`);
  console.log(`   Readings: ${averages.readings}`);

  // Estimate rainfall from humidity
  // Higher humidity typically correlates with more rainfall
  // This is a simplified model; in production, use actual rain sensors
  const estimatedRainfall = estimateRainfallFromHumidity(averages.humidity);

  console.log(`   Estimated rainfall: ${estimatedRainfall.toFixed(1)}mm/season`);

  // Generate historical training data points
  // Each point represents one growing season
  const startDate = Date.now() - numSeasons * 120 * 24 * 60 * 60 * 1000; // 120 days per season

  for (let i = 0; i < numSeasons; i++) {
    // Add realistic variation to sensor averages for each season
    const seasonalVariation = (Math.random() - 0.5) * 0.3; // ±15%

    const temperature = averages.temperature * (1 + seasonalVariation);
    const rainfall = estimatedRainfall * (1 + seasonalVariation);

    // Calculate realistic yield based on conditions
    const yieldValue = calculateYield({
      temperature,
      rainfall,
      soilType: farmMetadata.soilType,
      irrigationType: farmMetadata.irrigationType,
      fertilizer: farmMetadata.fertilizer,
      pesticides: farmMetadata.pesticides,
      cropType: farmMetadata.cropType,
    });

    const year = new Date().getFullYear() - Math.floor((numSeasons - i) / 2);
    const seasonName = i % 2 === 0 ? 'spring' : 'fall';

    dataPoints.push({
      rainfall,
      temperature,
      soilType: farmMetadata.soilType,
      irrigationType: farmMetadata.irrigationType,
      farmSize: farmMetadata.farmSize,
      fertilizer: farmMetadata.fertilizer,
      pesticides: farmMetadata.pesticides,
      yield: yieldValue,
      cropType: farmMetadata.cropType,
      season: `${year}-${seasonName}`,
      timestamp: startDate + i * 120 * 24 * 60 * 60 * 1000,
    });
  }

  const dataset: FarmDataset = {
    farmerId,
    dataPoints,
    privacyLevel: 'enhanced',
    totalSamples: numSeasons,
    crops: [farmMetadata.cropType],
    dateRange: {
      start: startDate,
      end: Date.now(),
    },
  };

  console.log(`✅ Generated ${numSeasons} training samples from Arduino data`);
  console.log(`   Crop: ${farmMetadata.cropType}`);
  console.log(`   Average yield: ${(dataPoints.reduce((sum, d) => sum + d.yield, 0) / numSeasons).toFixed(2)} tons/ha`);

  return dataset;
}

/**
 * Estimate seasonal rainfall from average humidity
 *
 * Simplified model based on agricultural research:
 * - Low humidity (< 50%): Dry conditions, low rainfall (200-400mm)
 * - Medium humidity (50-70%): Moderate rainfall (400-800mm)
 * - High humidity (> 70%): Wet conditions, high rainfall (800-1200mm)
 *
 * @param avgHumidity - Average humidity percentage
 * @returns Estimated rainfall in mm per season
 */
function estimateRainfallFromHumidity(avgHumidity: number): number {
  // Linear mapping with realistic bounds
  // 30% humidity → ~200mm (very dry)
  // 50% humidity → ~500mm (moderate)
  // 70% humidity → ~800mm (wet)
  // 90% humidity → ~1100mm (very wet)

  const minRainfall = 200;
  const maxRainfall = 1200;
  const minHumidity = 30;
  const maxHumidity = 90;

  // Clamp humidity to realistic range
  const clampedHumidity = Math.max(minHumidity, Math.min(maxHumidity, avgHumidity));

  // Linear interpolation
  const rainfall =
    minRainfall + ((clampedHumidity - minHumidity) / (maxHumidity - minHumidity)) * (maxRainfall - minRainfall);

  // Add some natural variation (±10%)
  const variation = (Math.random() - 0.5) * 0.2;
  return rainfall * (1 + variation);
}

/**
 * Calculate crop yield based on environmental conditions
 *
 * Simplified crop yield model based on agricultural research.
 * In production, this would be replaced by the trained ML model.
 *
 * Key factors:
 * - Temperature (optimal varies by crop)
 * - Rainfall (optimal around 600mm for most crops)
 * - Soil quality
 * - Irrigation efficiency
 * - Fertilizer input
 * - Pest management
 */
function calculateYield(params: {
  temperature: number;
  rainfall: number;
  soilType: string;
  irrigationType: string;
  fertilizer: number;
  pesticides: number;
  cropType: string;
}): number {
  const { temperature, rainfall, soilType, irrigationType, fertilizer, pesticides, cropType } = params;

  // Base yield by crop type (tons/hectare)
  const baseYields: Record<string, number> = {
    maize: 3.5,
    wheat: 3.0,
    rice: 4.0,
    soybeans: 2.5,
  };

  let yieldValue = baseYields[cropType] || 3.0;

  // Temperature impact (optimal varies by crop)
  const optimalTemps: Record<string, number> = {
    maize: 24,
    wheat: 20,
    rice: 26,
    soybeans: 25,
  };

  const optimalTemp = optimalTemps[cropType] || 24;
  const tempDeviation = Math.abs(temperature - optimalTemp);
  const tempFactor = Math.max(0.5, 1 - tempDeviation / 20);
  yieldValue *= tempFactor;

  // Rainfall impact (optimal around 600mm for most crops)
  const optimalRainfall = 600;
  const rainfallDeviation = Math.abs(rainfall - optimalRainfall);
  const rainfallFactor = Math.max(0.4, 1 - rainfallDeviation / 800);
  yieldValue *= rainfallFactor;

  // Soil type impact
  const soilMultipliers: Record<string, number> = {
    loamy: 1.2,
    clay: 1.0,
    sandy: 0.85,
    silty: 1.05,
    peaty: 0.9,
  };
  yieldValue *= soilMultipliers[soilType] || 1.0;

  // Irrigation type impact
  const irrigationMultipliers: Record<string, number> = {
    drip: 1.15,
    sprinkler: 1.1,
    flood: 1.0,
    rainfed: 0.9,
  };
  yieldValue *= irrigationMultipliers[irrigationType] || 1.0;

  // Fertilizer impact (diminishing returns)
  const fertilizerFactor = Math.min(1.3, 0.7 + Math.log(fertilizer / 50 + 1) * 0.3);
  yieldValue *= fertilizerFactor;

  // Pesticide impact (moderate use beneficial, overuse harmful)
  const pesticideFactor = pesticides <= 4 ? 1 + pesticides * 0.03 : 1.12 - (pesticides - 4) * 0.02;
  yieldValue *= pesticideFactor;

  // Add realistic noise (±20% variation)
  const noise = 1 + (Math.random() - 0.5) * 0.4;
  yieldValue *= noise;

  // Occasional extreme events (drought, flood, pests)
  if (Math.random() < 0.1) {
    yieldValue *= 0.3 + Math.random() * 0.4; // 30-70% loss
  }

  // Ensure realistic bounds
  return Math.max(0.5, Math.min(15, yieldValue));
}

/**
 * Get summary of Arduino data for display
 */
export function getArduinoDataSummary(bundle: ArduinoDataBundle): {
  temperature: string;
  humidity: string;
  readings: number;
  estimatedRainfall: string;
  dataQuality: 'good' | 'fair' | 'poor';
} {
  const { averages, sensorData } = bundle;

  // Assess data quality based on number of readings
  let dataQuality: 'good' | 'fair' | 'poor';
  if (sensorData.length >= 20) dataQuality = 'good';
  else if (sensorData.length >= 10) dataQuality = 'fair';
  else dataQuality = 'poor';

  const estimatedRainfall = estimateRainfallFromHumidity(averages.humidity);

  return {
    temperature: `${averages.temperature.toFixed(1)}°C`,
    humidity: `${averages.humidity.toFixed(1)}%`,
    readings: sensorData.length,
    estimatedRainfall: `${estimatedRainfall.toFixed(0)}mm/season`,
    dataQuality,
  };
}

/**
 * Check if Arduino data is available and valid
 */
export function hasValidArduinoData(): boolean {
  const bundle = loadArduinoSensorData();
  return bundle !== null && bundle.sensorData.length >= 5;
}
