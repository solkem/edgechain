import type { PredictionInput } from './data';

export interface PredictionOutput {
  predictedYield: number;
  confidence: number;
  modelVersion: number;
  timestamp: number;
  explanation?: {
    topFactors: {
      feature: string;
      impact: number;
    }[];
  };
}

export type YieldRecommendationStatus =
  | 'excellent'
  | 'good'
  | 'average'
  | 'below-average'
  | 'poor';

export interface YieldRecommendation {
  status: YieldRecommendationStatus;
  message: string;
  suggestions: string[];
}

export function validatePredictionInput(input: PredictionInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (input.rainfall < 0 || input.rainfall > 3000) {
    errors.push('Rainfall must be between 0 and 3000 mm');
  }

  if (input.temperature < -10 || input.temperature > 50) {
    errors.push('Temperature must be between -10 and 50°C');
  }

  if (input.farmSize <= 0 || input.farmSize > 10000) {
    errors.push('Farm size must be between 0 and 10,000 hectares');
  }

  if (input.fertilizer < 0 || input.fertilizer > 1000) {
    errors.push('Fertilizer must be between 0 and 1000 kg/hectare');
  }

  if (input.pesticides < 0 || input.pesticides > 20) {
    errors.push('Pesticides must be between 0 and 20 applications');
  }

  const validSoilTypes = ['loamy', 'clay', 'sandy', 'silty', 'peaty'];
  if (!validSoilTypes.includes(input.soilType.toLowerCase())) {
    errors.push(`Soil type must be one of: ${validSoilTypes.join(', ')}`);
  }

  const validIrrigationTypes = ['drip', 'sprinkler', 'flood', 'rainfed'];
  if (!validIrrigationTypes.includes(input.irrigationType.toLowerCase())) {
    errors.push(`Irrigation type must be one of: ${validIrrigationTypes.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function formatYieldPrediction(prediction: PredictionOutput): string {
  const yieldTons = prediction.predictedYield.toFixed(2);
  const confidencePct = (prediction.confidence * 100).toFixed(1);

  return `${yieldTons} tons/hectare (${confidencePct}% confidence)`;
}

export function getYieldRecommendation(
  prediction: PredictionOutput,
  averageYield: number = 4.0
): YieldRecommendation {
  const predicted = prediction.predictedYield;
  const ratio = predicted / averageYield;

  if (ratio >= 1.2) {
    return {
      status: 'excellent',
      message: 'Excellent yield predicted! Your conditions are optimal.',
      suggestions: [
        'Maintain current farming practices',
        'Consider documenting your approach for future seasons',
        'Share your success with the farming community',
      ],
    };
  }

  if (ratio >= 1.05) {
    return {
      status: 'good',
      message: "Good yield predicted. You're on the right track.",
      suggestions: [
        'Continue current practices',
        'Monitor IoT sensors for any changes',
        'Consider minor optimizations',
      ],
    };
  }

  if (ratio >= 0.9) {
    return {
      status: 'average',
      message: 'Average yield predicted. Room for improvement.',
      suggestions: [
        'Review fertilizer application timing',
        'Check soil moisture levels regularly',
        'Consider adjusting irrigation schedule',
      ],
    };
  }

  if (ratio >= 0.7) {
    return {
      status: 'below-average',
      message: 'Below-average yield predicted. Action recommended.',
      suggestions: [
        'Check for pest or disease issues',
        'Review water management practices',
        'Consider soil testing',
        'Consult with agricultural extension services',
      ],
    };
  }

  return {
    status: 'poor',
    message: 'Low yield predicted. Immediate action needed.',
    suggestions: [
      'Urgent: Check for major issues (pests, disease, drought)',
      'Review all farming inputs and practices',
      'Consider expert consultation',
      'Check IoT sensor calibration',
    ],
  };
}
