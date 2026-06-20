import { clamp, cosineSimilarity, createSeededNormal, mean, norm, standardDeviation, vectorMean } from './math';
import type { PhysicalBounds } from './types';

export const DEFAULT_PHYSICAL_BOUNDS: PhysicalBounds = {
  soilTempC: [8, 42],
  soilMoisture: [0.05, 0.95],
  airTempC: [12, 38],
  humidity: [0, 100],
  pressureHpa: [895, 925],
  lux: [0, 110_000],
};

export function physicalPlausibilityScore(
  updateVector: number[],
  bounds: PhysicalBounds = DEFAULT_PHYSICAL_BOUNDS,
  seed = 0,
  nVirtualSamples = 64,
): number {
  if (updateVector.length === 0) {
    return 0;
  }

  const references = virtualReferenceUpdates(updateVector.length, bounds, seed, nVirtualSamples);
  const center = vectorMean(references);
  const directionScore = Math.max(0, cosineSimilarity(updateVector, center));

  const referenceNorms = references.map(norm);
  const updateNorm = norm(updateVector);
  const meanNorm = mean(referenceNorms);
  const stdNorm = standardDeviation(referenceNorms);
  const normScore = stdNorm === 0 ? 1 : clamp(1 - Math.max(0, Math.abs(updateNorm - meanNorm) / stdNorm - 2) / 2);

  return clamp(0.7 * directionScore + 0.3 * normScore);
}

function virtualReferenceUpdates(
  dimension: number,
  bounds: PhysicalBounds,
  seed: number,
  nVirtualSamples: number,
): number[][] {
  const ranges = [
    bounds.soilTempC[1] - bounds.soilTempC[0],
    bounds.soilMoisture[1] - bounds.soilMoisture[0],
    bounds.airTempC[1] - bounds.airTempC[0],
    bounds.humidity[1] - bounds.humidity[0],
    bounds.pressureHpa[1] - bounds.pressureHpa[0],
    bounds.lux[1] - bounds.lux[0],
  ];
  const rangeNorm = norm(ranges);
  const normalizedRanges = ranges.map((value) => value / rangeNorm);
  const base = Array.from({ length: dimension }, (_, index) => normalizedRanges[index % normalizedRanges.length]);
  const normal = createSeededNormal(seed);

  return Array.from({ length: nVirtualSamples }, () =>
    base.map((value) => value + normal() * 0.05),
  );
}
