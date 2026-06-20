export type MarsAction = 'accept' | 'flag' | 'reject' | 'skip_round';

export interface ClientUpdate {
  roundId: number;
  siteId: string;
  updateVector: number[];
  datasetSize: number;
  hasValidAttestation: boolean;
  metadata?: Record<string, unknown>;
}

export interface MarsScore {
  roundId: number;
  siteId: string;
  hasScore: number;
  physicalPlausibility: number;
  spatialJury: number;
  temporalConsistency: number;
  gradientNormBounds: number;
  composite: number;
  action: MarsAction;
  eligibleForReward: boolean;
}

export interface MarsThresholds {
  accept: number;
  flag: number;
  reward: number;
}

export interface MarsWeights {
  physicalPlausibility: number;
  spatialJury: number;
  temporalConsistency: number;
  gradientNormBounds: number;
}

export interface PhysicalBounds {
  soilTempC: [number, number];
  soilMoisture: [number, number];
  airTempC: [number, number];
  humidity: [number, number];
  pressureHpa: [number, number];
  lux: [number, number];
}

export interface ScoreRoundOptions {
  seed: number;
  history?: TemporalHistory;
  thresholds?: MarsThresholds;
  weights?: MarsWeights;
  physicalBounds?: PhysicalBounds;
}

export interface TemporalHistory {
  scoreAndUpdate(siteId: string, update: number[]): number;
}
