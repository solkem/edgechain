/**
 * FL Data Collection Module - Affordable IoT Sensor Data
 *
 * Handles collection and management of IoT sensor data from farms
 * All data stays LOCAL on farmer's device for privacy
 *
 * DESIGNED FOR SMALL-HOLDER FARMERS:
 * - Low-cost sensors ($5-$50 per device)
 * - Smartphone as IoT gateway (no expensive gateway needed)
 * - Simple sensors: DHT22 (temp/humidity), soil moisture probes
 * - Manual rain gauge readings via smartphone camera
 * - Open-source hardware (Arduino, ESP32, Raspberry Pi Zero)
 *
 * Data Sources:
 * - DIY weather station ($20-40): DHT22 sensor + rain gauge
 * - Soil moisture sensors ($5-10 each): Capacitive probes
 * - Smartphone camera: Manual readings of analog sensors
 * - SMS/WhatsApp: Manual input of observations
 * - Existing weather data APIs (free)
 */

import type { FarmDataPoint, FarmDataset, PredictionInput } from './types';

// ============================================================================
// IOT SENSOR DATA TYPES (Affordable Sensors)
// ============================================================================

/**
 * Raw IoT sensor reading from affordable devices
 */
export interface IoTSensorReading {
  sensorId: string;
  sensorType:
    | 'dht22'          // DHT22 temp/humidity sensor ($5)
    | 'soil-moisture'  // Capacitive soil moisture ($5-10)
    | 'rain-gauge'     // Manual rain gauge reading (smartphone camera)
    | 'smartphone'     // Manual observation via smartphone
    | 'weather-api';   // Free weather API data
  timestamp: number;
  data: Record<string, number | string | boolean>;
  source: 'sensor' | 'manual' | 'api'; // How data was collected
}

/**
 * Aggregated IoT data for a time period
 */
export interface IoTAggregatedData {
  period: string;           // '2024-03-15' (daily aggregation)
  rainfall: number;         // total mm for period
  avgTemperature: number;   // average °C
  avgHumidity: number;      // average %
  avgSoilMoisture: number;  // average %
  avgSoilPH: number;        // average pH
  soilNPK: {                // soil nutrients
    nitrogen: number;
    phosphorus: number;
    potassium: number;
  };
  cropHealthScore: number;  // 0-100 from image analysis
  readings: number;         // number of sensor readings
}

// ============================================================================
// DATA VALIDATION
// ============================================================================

/**
 * Validate a farm data point from IoT sensors
 */
export function validateDataPoint(data: Partial<FarmDataPoint>): string | null {
  if (typeof data.rainfall !== 'number' || data.rainfall < 0 || data.rainfall > 5000) {
    return 'Rainfall must be between 0-5000mm';
  }
  if (typeof data.temperature !== 'number' || data.temperature < -10 || data.temperature > 50) {
    return 'Temperature must be between -10 and 50°C';
  }
  if (!data.soilType || !['loamy', 'clay', 'sandy', 'silty', 'peaty'].includes(data.soilType)) {
    return 'Invalid soil type';
  }
  if (!data.irrigationType || !['drip', 'sprinkler', 'flood', 'rainfed'].includes(data.irrigationType)) {
    return 'Invalid irrigation type';
  }
  if (typeof data.farmSize !== 'number' || data.farmSize <= 0 || data.farmSize > 10000) {
    return 'Farm size must be between 0-10000 hectares';
  }
  if (typeof data.fertilizer !== 'number' || data.fertilizer < 0 || data.fertilizer > 1000) {
    return 'Fertilizer must be between 0-1000 kg/ha';
  }
  if (typeof data.pesticides !== 'number' || data.pesticides < 0 || data.pesticides > 20) {
    return 'Pesticides must be between 0-20 applications';
  }
  if (typeof data.yield !== 'number' || data.yield < 0 || data.yield > 50) {
    return 'Yield must be between 0-50 tons/ha';
  }
  if (!data.cropType || data.cropType.length === 0) {
    return 'Crop type is required';
  }

  return null; // valid
}

// ============================================================================
// IOT DATA SIMULATION (for demo/testing)
// ============================================================================

/**
 * Simulate affordable IoT sensor stream
 * In production, this would connect to:
 * - ESP32/Arduino via Bluetooth
 * - Smartphone camera for manual readings
 * - Free weather APIs (OpenWeatherMap, etc.)
 */
export function* simulateIoTSensorStream(
  durationMs: number = 10000,
  intervalMs: number = 1000
): Generator<IoTSensorReading> {
  const startTime = Date.now();

  // Affordable sensor setup (total cost ~$30-50)
  const sensors = [
    { id: 'dht22-001', type: 'dht22' as const, source: 'sensor' as const },        // $5 temp/humidity
    { id: 'soil-moisture-001', type: 'soil-moisture' as const, source: 'sensor' as const },  // $8 capacitive probe
    { id: 'soil-moisture-002', type: 'soil-moisture' as const, source: 'sensor' as const },  // $8 another probe
    { id: 'rain-gauge-001', type: 'rain-gauge' as const, source: 'manual' as const },  // Manual reading via phone
    { id: 'weather-api-001', type: 'weather-api' as const, source: 'api' as const },   // Free API
    { id: 'smartphone-001', type: 'smartphone' as const, source: 'manual' as const }, // Manual observations
  ];

  while (Date.now() - startTime < durationMs) {
    for (const sensor of sensors) {
      let data: Record<string, number | string | boolean> = {};

      switch (sensor.type) {
        case 'dht22':
          // DHT22 sensor: temperature + humidity (±0.5°C, ±2% accuracy)
          data = {
            temperature: 20 + Math.random() * 10 + Math.sin(Date.now() / 10000) * 5,
            humidity: 60 + Math.random() * 20,
            batteryLevel: 85 + Math.random() * 15, // %
          };
          break;

        case 'soil-moisture':
          // Capacitive soil moisture sensor (0-100% reading)
          data = {
            moisture: 30 + Math.random() * 40, // % moisture
            rawValue: 200 + Math.random() * 600, // ADC reading
          };
          break;

        case 'rain-gauge':
          // Manual reading from simple rain gauge (farmer uses phone camera to read)
          data = {
            rainfall: Math.random() > 0.9 ? Math.random() * 5 : 0, // mm (occasional rain)
            manualReading: true,
          };
          break;

        case 'weather-api':
          // Free weather API data (OpenWeatherMap, etc.)
          data = {
            temperature: 22 + Math.random() * 8,
            humidity: 65 + Math.random() * 15,
            windSpeed: Math.random() * 12,
            cloudCover: Math.random() * 100,
            forecast: Math.random() > 0.7 ? 'rain' : 'clear',
          };
          break;

        case 'smartphone':
          // Manual observations via smartphone app
          data = {
            cropHeight: 50 + Math.random() * 100, // cm
            diseaseObserved: Math.random() > 0.95,
            pestObserved: Math.random() > 0.97,
            notes: 'Crop looking healthy',
          };
          break;
      }

      yield {
        sensorId: sensor.id,
        sensorType: sensor.type,
        timestamp: Date.now(),
        data,
        source: sensor.source,
      };
    }

    // Wait for next interval
    const sleepMs = intervalMs;
    const sleepUntil = Date.now() + sleepMs;
    while (Date.now() < sleepUntil) {
      // Busy wait (in real app, use actual sleep)
    }
  }
}

/**
 * Aggregate IoT sensor readings into daily summaries
 */
export function aggregateIoTReadings(readings: IoTSensorReading[]): IoTAggregatedData[] {
  // Group by day
  const byDay = new Map<string, IoTSensorReading[]>();

  for (const reading of readings) {
    const day = new Date(reading.timestamp).toISOString().split('T')[0];
    if (!byDay.has(day)) {
      byDay.set(day, []);
    }
    byDay.get(day)!.push(reading);
  }

  // Aggregate each day
  const aggregated: IoTAggregatedData[] = [];

  for (const [day, dayReadings] of byDay.entries()) {
    let totalRainfall = 0;
    let sumTemp = 0;
    let sumHumidity = 0;
    let sumMoisture = 0;
    let sumPH = 0;
    let sumN = 0, sumP = 0, sumK = 0;
    let sumHealth = 0;
    let tempCount = 0, moistureCount = 0, healthCount = 0;

    for (const reading of dayReadings) {
      // DHT22 sensor data
      if (reading.sensorType === 'dht22') {
        if (typeof reading.data.temperature === 'number') {
          sumTemp += reading.data.temperature;
          tempCount++;
        }
        if (typeof reading.data.humidity === 'number') {
          sumHumidity += reading.data.humidity;
        }
      }

      // Soil moisture sensors
      if (reading.sensorType === 'soil-moisture') {
        if (typeof reading.data.moisture === 'number') {
          sumMoisture += reading.data.moisture;
          moistureCount++;
        }
      }

      // Manual rain gauge readings
      if (reading.sensorType === 'rain-gauge') {
        if (typeof reading.data.rainfall === 'number') {
          totalRainfall += reading.data.rainfall;
        }
      }

      // Weather API data
      if (reading.sensorType === 'weather-api') {
        if (typeof reading.data.temperature === 'number') {
          sumTemp += reading.data.temperature;
          tempCount++;
        }
        if (typeof reading.data.humidity === 'number') {
          sumHumidity += reading.data.humidity;
        }
      }

      // Smartphone manual observations
      if (reading.sensorType === 'smartphone') {
        if (typeof reading.data.cropHealth === 'number') {
          sumHealth += reading.data.cropHealth;
          healthCount++;
        }
      }
    }

    aggregated.push({
      period: day,
      rainfall: totalRainfall,
      avgTemperature: tempCount > 0 ? sumTemp / tempCount : 20,
      avgHumidity: dayReadings.length > 0 ? sumHumidity / dayReadings.length : 60,
      avgSoilMoisture: moistureCount > 0 ? sumMoisture / moistureCount : 40,
      avgSoilPH: dayReadings.length > 0 ? sumPH / dayReadings.length : 6.5,
      soilNPK: {
        nitrogen: dayReadings.length > 0 ? sumN / dayReadings.length : 40,
        phosphorus: dayReadings.length > 0 ? sumP / dayReadings.length : 20,
        potassium: dayReadings.length > 0 ? sumK / dayReadings.length : 30,
      },
      cropHealthScore: healthCount > 0 ? sumHealth / healthCount : 80,
      readings: dayReadings.length,
    });
  }

  return aggregated;
}

/**
 * Convert IoT aggregated data to training data point
 */
export function iotDataToTrainingPoint(
  iotData: IoTAggregatedData,
  metadata: {
    cropType: string;
    soilType: string;
    irrigationType: string;
    farmSize: number;
    fertilizer: number;
    pesticides: number;
    actualYield?: number;
  }
): FarmDataPoint {
  return {
    // From IoT sensors
    rainfall: iotData.rainfall,
    temperature: iotData.avgTemperature,

    // From farm metadata (configured once)
    soilType: metadata.soilType,
    irrigationType: metadata.irrigationType,
    farmSize: metadata.farmSize,
    fertilizer: metadata.fertilizer,
    pesticides: metadata.pesticides,
    cropType: metadata.cropType,

    // Target (actual yield - collected at harvest)
    yield: metadata.actualYield || 0, // 0 means not harvested yet

    // Metadata
    season: iotData.period,
    timestamp: new Date(iotData.period).getTime(),
  };
}

// ============================================================================
// SAMPLE DATA GENERATION (IoT-based)
// ============================================================================

/**
 * Generate realistic IoT sample data for testing/demo
 * Simulates historical IoT sensor readings
 */
export function generateSampleData(
  numSeasons: number,
  cropType: string,
  farmerId: string
): FarmDataset {
  const dataPoints: FarmDataPoint[] = [];
  const soilTypes = ['loamy', 'clay', 'sandy', 'silty', 'peaty'];
  const irrigationTypes = ['drip', 'sprinkler', 'flood', 'rainfed'];

  // Farm metadata (stays constant)
  const farmSize = 5 + Math.random() * 45; // 5-50 hectares
  const soilType = soilTypes[Math.floor(Math.random() * soilTypes.length)];
  const irrigationType = irrigationTypes[Math.floor(Math.random() * irrigationTypes.length)];

  for (let season = 0; season < numSeasons; season++) {
    // Simulate IoT sensor data collection over growing season (120 days)
    const seasonalRainfall = 300 + Math.random() * 700; // total for season
    const avgTemp = 18 + Math.random() * 12;

    // Fertilizer and pesticides vary by season
    const fertilizer = 50 + Math.random() * 200;
    const pesticides = Math.floor(Math.random() * 10);

    // Calculate yield based on IoT data and inputs
    let baseYield = 3.0;

    // Rainfall impact (optimal around 600mm)
    const rainfallFactor = 1 - Math.abs(seasonalRainfall - 600) / 1000;
    baseYield *= (0.7 + rainfallFactor * 0.6);

    // Temperature impact (optimal around 24°C)
    const tempFactor = 1 - Math.abs(avgTemp - 24) / 20;
    baseYield *= (0.8 + tempFactor * 0.4);

    // Soil type impact
    const soilBonus = soilType === 'loamy' ? 1.2 : soilType === 'clay' ? 1.0 : 0.9;
    baseYield *= soilBonus;

    // Irrigation impact
    const irrigationBonus = irrigationType === 'drip' ? 1.15 : irrigationType === 'sprinkler' ? 1.1 : 1.0;
    baseYield *= irrigationBonus;

    // Fertilizer impact (diminishing returns)
    baseYield *= (1 + Math.log(fertilizer / 50 + 1) * 0.2);

    // Pesticides impact
    const pesticideFactor = pesticides < 6 ? 1 + pesticides * 0.02 : 1.1 - (pesticides - 6) * 0.03;
    baseYield *= pesticideFactor;

    // Add noise (±15%)
    baseYield *= (0.85 + Math.random() * 0.3);

    // Crop-specific adjustments
    if (cropType === 'Rice') baseYield *= 1.3;
    if (cropType === 'Wheat') baseYield *= 1.0;
    if (cropType === 'Corn') baseYield *= 1.4;
    if (cropType === 'Soybeans') baseYield *= 0.8;

    const year = 2020 + Math.floor(season / 2);
    const seasonName = season % 2 === 0 ? 'spring' : 'fall';

    dataPoints.push({
      rainfall: seasonalRainfall,
      temperature: avgTemp,
      soilType,
      irrigationType,
      farmSize,
      fertilizer,
      pesticides,
      yield: Math.max(0.5, Math.min(15, baseYield)),
      cropType,
      season: `${year}-${seasonName}`,
      timestamp: Date.now() - (numSeasons - season) * 90 * 86400000, // 90 days per season
    });
  }

  const timestamps = dataPoints.map(d => d.timestamp);

  return {
    farmerId,
    dataPoints,
    privacyLevel: 'enhanced',
    totalSamples: numSeasons,
    crops: [cropType],
    dateRange: {
      start: Math.min(...timestamps),
      end: Math.max(...timestamps),
    },
  };
}

// ============================================================================
// DATA PREPROCESSING
// ============================================================================

/**
 * Encode categorical features to numeric
 */
export function encodeCategorical(value: string, category: 'soil' | 'irrigation'): number[] {
  if (category === 'soil') {
    const soils = ['loamy', 'clay', 'sandy', 'silty', 'peaty'];
    return soils.map(s => s === value ? 1 : 0);
  }

  if (category === 'irrigation') {
    const types = ['drip', 'sprinkler', 'flood', 'rainfed'];
    return types.map(t => t === value ? 1 : 0);
  }

  return [];
}

/**
 * Normalize numeric features to 0-1 range
 */
export function normalizeFeature(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return (value - min) / (max - min);
}

/**
 * Convert farm data point to model input tensor
 */
export function dataPointToTensor(data: FarmDataPoint): number[] {
  const features: number[] = [];

  // Numeric features (normalized)
  features.push(normalizeFeature(data.rainfall, 0, 2000));
  features.push(normalizeFeature(data.temperature, 0, 40));
  features.push(normalizeFeature(data.farmSize, 0, 100));
  features.push(normalizeFeature(data.fertilizer, 0, 500));
  features.push(normalizeFeature(data.pesticides, 0, 15));

  // Categorical features (one-hot encoded)
  features.push(...encodeCategorical(data.soilType, 'soil'));
  features.push(...encodeCategorical(data.irrigationType, 'irrigation'));

  return features; // Total: 14 features
}

/**
 * Convert prediction input to model input tensor
 */
export function predictionInputToTensor(input: PredictionInput): number[] {
  const features: number[] = [];

  features.push(normalizeFeature(input.rainfall, 0, 2000));
  features.push(normalizeFeature(input.temperature, 0, 40));
  features.push(normalizeFeature(input.farmSize, 0, 100));
  features.push(normalizeFeature(input.fertilizer, 0, 500));
  features.push(normalizeFeature(input.pesticides, 0, 15));
  features.push(...encodeCategorical(input.soilType, 'soil'));
  features.push(...encodeCategorical(input.irrigationType, 'irrigation'));

  return features;
}

/**
 * Prepare dataset for training
 */
export function prepareTrainingData(dataset: FarmDataset): {
  inputs: number[][];
  targets: number[][];
} {
  const inputs: number[][] = [];
  const targets: number[][] = [];

  for (const dataPoint of dataset.dataPoints) {
    inputs.push(dataPointToTensor(dataPoint));
    targets.push([dataPoint.yield]);
  }

  return { inputs, targets };
}

// ============================================================================
// DATA STORAGE (LOCAL - Privacy Preserving)
// ============================================================================

const STORAGE_KEY = 'edgechain_farm_dataset';
const IOT_READINGS_KEY = 'edgechain_iot_readings';

/**
 * Save dataset to browser localStorage
 * Data NEVER leaves the device for privacy
 */
export function saveDatasetLocally(dataset: FarmDataset): void {
  try {
    const serialized = JSON.stringify(dataset);
    localStorage.setItem(STORAGE_KEY, serialized);
    console.log(`✅ Saved ${dataset.totalSamples} data points locally (IoT-based)`);
  } catch (error) {
    console.error('Failed to save dataset:', error);
    throw new Error('Failed to save dataset to local storage');
  }
}

/**
 * Load dataset from browser localStorage
 */
export function loadDatasetLocally(): FarmDataset | null {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) return null;

    const dataset = JSON.parse(serialized) as FarmDataset;
    console.log(`✅ Loaded ${dataset.totalSamples} IoT-based data points`);
    return dataset;
  } catch (error) {
    console.error('Failed to load dataset:', error);
    return null;
  }
}

/**
 * Save raw IoT readings (for processing later)
 */
export function saveIoTReadings(readings: IoTSensorReading[]): void {
  try {
    const serialized = JSON.stringify(readings);
    localStorage.setItem(IOT_READINGS_KEY, serialized);
    console.log(`✅ Saved ${readings.length} IoT sensor readings`);
  } catch (error) {
    console.error('Failed to save IoT readings:', error);
  }
}

/**
 * Load raw IoT readings
 */
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

/**
 * Clear all local data
 */
export function clearAllLocalData(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(IOT_READINGS_KEY);
  console.log('✅ Cleared all local IoT data');
}

// ============================================================================
// DATA STATISTICS
// ============================================================================

/**
 * Calculate statistics for a dataset
 */
export function calculateDatasetStats(dataset: FarmDataset) {
  const { dataPoints } = dataset;

  if (dataPoints.length === 0) return null;

  const yields = dataPoints.map(d => d.yield);
  const rainfalls = dataPoints.map(d => d.rainfall);
  const temps = dataPoints.map(d => d.temperature);

  return {
    samples: dataPoints.length,
    yield: {
      mean: yields.reduce((a, b) => a + b, 0) / yields.length,
      min: Math.min(...yields),
      max: Math.max(...yields),
    },
    rainfall: {
      mean: rainfalls.reduce((a, b) => a + b, 0) / rainfalls.length,
      min: Math.min(...rainfalls),
      max: Math.max(...rainfalls),
    },
    temperature: {
      mean: temps.reduce((a, b) => a + b, 0) / temps.length,
      min: Math.min(...temps),
      max: Math.max(...temps),
    },
    crops: dataset.crops,
    dateRange: {
      start: new Date(dataset.dateRange.start).toLocaleDateString(),
      end: new Date(dataset.dateRange.end).toLocaleDateString(),
    },
  };
}

// ============================================================================
// MOCK DATA GENERATION (for demo/testing)
// ============================================================================

/**
 * Generate mock farm dataset for demo purposes
 * In production, this would come from real IoT sensors
 *
 * @param farmerId - Midnight wallet address
 * @param numSeasons - Number of seasons of historical data
 * @param region - Geographic region for realistic data ('kenya' | 'california' | 'india')
 */
export function generateMockFarmDataset(
  farmerId: string,
  numSeasons: number,
  region: 'kenya' | 'california' | 'india' = 'kenya'
): FarmDataset {
  const dataPoints: FarmDataPoint[] = [];
  const startDate = Date.now() - (numSeasons * 120 * 24 * 60 * 60 * 1000); // ~120 days per season

  // Region-specific parameters
  const regionParams = {
    kenya: {
      rainfall: { base: 600, variance: 300 },
      temperature: { base: 24, variance: 4 },
      soilTypes: ['loamy', 'clay', 'sandy'] as const,
      irrigationTypes: ['rainfed', 'drip'] as const,
      cropType: 'wheat',
      yieldMultiplier: 1.0,
    },
    california: {
      rainfall: { base: 450, variance: 200 },
      temperature: { base: 20, variance: 6 },
      soilTypes: ['loamy', 'sandy'] as const,
      irrigationTypes: ['drip', 'sprinkler'] as const,
      cropType: 'wheat',
      yieldMultiplier: 1.2, // Better yields due to tech/infrastructure
    },
    india: {
      rainfall: { base: 800, variance: 400 },
      temperature: { base: 28, variance: 5 },
      soilTypes: ['clay', 'loamy', 'silty'] as const,
      irrigationTypes: ['flood', 'rainfed'] as const,
      cropType: 'wheat',
      yieldMultiplier: 0.9,
    },
  };

  const params = regionParams[region];

  for (let i = 0; i < numSeasons; i++) {
    const rainfall = params.rainfall.base + (Math.random() - 0.5) * params.rainfall.variance;
    const temperature = params.temperature.base + (Math.random() - 0.5) * params.temperature.variance;
    const farmSize = 5 + Math.random() * 15; // 5-20 hectares
    const fertilizer = 100 + Math.random() * 200;
    const pesticides = Math.floor(Math.random() * 8) + 2;

    // Simple yield model: f(rainfall, temp, fertilizer, ...)
    const baseYield = 3.5;
    const rainfallFactor = Math.max(0, 1 - Math.abs(rainfall - 650) / 1000);
    const tempFactor = Math.max(0, 1 - Math.abs(temperature - 22) / 20);
    const fertilizerFactor = Math.min(1.5, fertilizer / 200);
    const randomNoise = 0.9 + Math.random() * 0.2;

    const yield_value =
      baseYield *
      rainfallFactor *
      tempFactor *
      fertilizerFactor *
      params.yieldMultiplier *
      randomNoise;

    dataPoints.push({
      rainfall,
      temperature,
      soilType: params.soilTypes[Math.floor(Math.random() * params.soilTypes.length)],
      irrigationType: params.irrigationTypes[Math.floor(Math.random() * params.irrigationTypes.length)],
      farmSize,
      fertilizer,
      pesticides,
      yield: yield_value,
      cropType: params.cropType,
      season: `2024-season-${i + 1}`,
      timestamp: startDate + (i * 120 * 24 * 60 * 60 * 1000),
    });
  }

  return {
    farmerId,
    dataPoints,
    privacyLevel: 'basic',
    totalSamples: numSeasons,
    crops: [params.cropType],
    dateRange: {
      start: startDate,
      end: Date.now(),
    },
  };
}
