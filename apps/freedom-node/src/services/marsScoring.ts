import {
  DEFAULT_WEIGHTS,
  MarsScore,
  actionForComposite,
  compositeScore,
} from '@edgechain/mars';

export type CollectionMode = 'auto' | 'manual';

export interface SensorContributionInput {
  siteId: string;
  roundId: number;
  temperature: number;
  humidity: number;
  collectionMode: CollectionMode;
  hasValidAttestation: boolean;
  datasetSize?: number;
  timestamp?: number;
  metadata?: Record<string, unknown>;
}

export interface SensorContributionReward {
  reward: number;
  rewardUnit: 'tDUST';
  score: MarsScore;
}

const MAX_REWARD_BY_MODE: Record<CollectionMode, number> = {
  auto: 0.1,
  manual: 0.02,
};

export class MarsScoringService {
  scoreSensorContribution(input: SensorContributionInput): MarsScore {
    this.validateInput(input);

    const hasScore = input.hasValidAttestation ? 1 : 0;
    const physicalPlausibility = this.sensorPhysicalPlausibility(input);
    const spatialJury = 0.5;
    const temporalConsistency = 0.7;
    const gradientNormBounds = 1;
    const composite = compositeScore(
      hasScore,
      physicalPlausibility,
      spatialJury,
      temporalConsistency,
      gradientNormBounds,
      DEFAULT_WEIGHTS,
    );

    return {
      roundId: input.roundId,
      siteId: input.siteId,
      hasScore,
      physicalPlausibility,
      spatialJury,
      temporalConsistency,
      gradientNormBounds,
      composite,
      action: actionForComposite(composite),
      eligibleForReward: composite >= 0.6 && hasScore > 0,
    };
  }

  calculateSensorReward(input: SensorContributionInput): SensorContributionReward {
    const score = this.scoreSensorContribution(input);
    const maxReward = MAX_REWARD_BY_MODE[input.collectionMode];

    return {
      reward: score.eligibleForReward ? maxReward : 0,
      rewardUnit: 'tDUST',
      score,
    };
  }

  private sensorPhysicalPlausibility(input: SensorContributionInput): number {
    const temperatureScore = this.rangeScore(input.temperature, -10, 50, 8, 42);
    const humidityScore = this.rangeScore(input.humidity, 0, 100, 0, 100);
    return (temperatureScore + humidityScore) / 2;
  }

  private rangeScore(value: number, hardMin: number, hardMax: number, softMin: number, softMax: number): number {
    if (value < hardMin || value > hardMax) {
      return 0;
    }

    if (value >= softMin && value <= softMax) {
      return 1;
    }

    if (value < softMin) {
      return (value - hardMin) / (softMin - hardMin);
    }

    return (hardMax - value) / (hardMax - softMax);
  }

  private validateInput(input: SensorContributionInput): void {
    if (!Number.isFinite(input.temperature)) {
      throw new Error('temperature must be a finite number for MARS scoring');
    }

    if (!Number.isFinite(input.humidity)) {
      throw new Error('humidity must be a finite number for MARS scoring');
    }
  }
}
