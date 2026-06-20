export interface FarmDataPoint {
  rainfall: number;
  temperature: number;
  soilType: string;
  irrigationType: string;
  farmSize: number;
  fertilizer: number;
  pesticides: number;
  yield: number;
  cropType: string;
  season: string;
  timestamp: number;
}

export interface FarmDataset {
  farmerId: string;
  dataPoints: FarmDataPoint[];
  privacyLevel: 'basic' | 'enhanced' | 'detailed';
  totalSamples: number;
  crops: string[];
  dateRange: {
    start: number;
    end: number;
  };
}

export interface PredictionInput {
  rainfall: number;
  temperature: number;
  soilType: string;
  irrigationType: string;
  farmSize: number;
  fertilizer: number;
  pesticides: number;
  cropType: string;
}

export interface DatasetStats {
  samples: number;
  yield: {
    mean: number;
    min: number;
    max: number;
  };
  rainfall: {
    mean: number;
    min: number;
    max: number;
  };
  temperature: {
    mean: number;
    min: number;
    max: number;
  };
  crops: string[];
  dateRange: {
    start: string;
    end: string;
  };
}

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

  return null;
}

export function encodeCategorical(value: string, category: 'soil' | 'irrigation'): number[] {
  if (category === 'soil') {
    const soils = ['loamy', 'clay', 'sandy', 'silty', 'peaty'];
    return soils.map((soil) => (soil === value ? 1 : 0));
  }

  const types = ['drip', 'sprinkler', 'flood', 'rainfed'];
  return types.map((type) => (type === value ? 1 : 0));
}

export function normalizeFeature(value: number, min: number, max: number): number {
  if (max === min) {
    return 0.5;
  }
  return (value - min) / (max - min);
}

export function dataPointToTensor(data: FarmDataPoint): number[] {
  return [
    normalizeFeature(data.rainfall, 0, 2000),
    normalizeFeature(data.temperature, 0, 40),
    normalizeFeature(data.farmSize, 0, 100),
    normalizeFeature(data.fertilizer, 0, 500),
    normalizeFeature(data.pesticides, 0, 15),
    ...encodeCategorical(data.soilType, 'soil'),
    ...encodeCategorical(data.irrigationType, 'irrigation'),
  ];
}

export function predictionInputToTensor(input: PredictionInput): number[] {
  return [
    normalizeFeature(input.rainfall, 0, 2000),
    normalizeFeature(input.temperature, 0, 40),
    normalizeFeature(input.farmSize, 0, 100),
    normalizeFeature(input.fertilizer, 0, 500),
    normalizeFeature(input.pesticides, 0, 15),
    ...encodeCategorical(input.soilType, 'soil'),
    ...encodeCategorical(input.irrigationType, 'irrigation'),
  ];
}

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

export function calculateDatasetStats(dataset: FarmDataset): DatasetStats | null {
  const { dataPoints } = dataset;

  if (dataPoints.length === 0) {
    return null;
  }

  const yields = dataPoints.map((dataPoint) => dataPoint.yield);
  const rainfalls = dataPoints.map((dataPoint) => dataPoint.rainfall);
  const temps = dataPoints.map((dataPoint) => dataPoint.temperature);

  return {
    samples: dataPoints.length,
    yield: {
      mean: mean(yields),
      min: Math.min(...yields),
      max: Math.max(...yields),
    },
    rainfall: {
      mean: mean(rainfalls),
      min: Math.min(...rainfalls),
      max: Math.max(...rainfalls),
    },
    temperature: {
      mean: mean(temps),
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

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
