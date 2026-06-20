export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export function mean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function standardDeviation(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const average = mean(values);
  const variance = mean(values.map((value) => (value - average) ** 2));
  return Math.sqrt(variance);
}

export function vectorMean(vectors: number[][]): number[] {
  if (vectors.length === 0) {
    return [];
  }
  const dimension = vectors[0]?.length ?? 0;
  return Array.from({ length: dimension }, (_, index) =>
    mean(vectors.map((vector) => vector[index] ?? 0)),
  );
}

export function norm(vector: number[]): number {
  return Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
}

export function dot(left: number[], right: number[]): number {
  const dimension = Math.min(left.length, right.length);
  let total = 0;
  for (let index = 0; index < dimension; index += 1) {
    total += left[index] * right[index];
  }
  return total;
}

export function cosineSimilarity(left: number[], right: number[]): number {
  const leftNorm = norm(left);
  const rightNorm = norm(right);
  if (leftNorm === 0 || rightNorm === 0) {
    return 0;
  }
  return dot(left, right) / (leftNorm * rightNorm);
}

export function gini(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  if (values.some((value) => value < 0)) {
    throw new Error('gini values must be non-negative');
  }
  if (values.every((value) => value === 0)) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const n = sorted.length;
  const weightedSum = sorted.reduce((sum, value, index) => sum + (index + 1) * value, 0);
  const total = sorted.reduce((sum, value) => sum + value, 0);
  return (2 * weightedSum) / (n * total) - (n + 1) / n;
}

export function createSeededNormal(seed: number): () => number {
  let state = seed >>> 0;
  let spare: number | undefined;

  const uniform = (): number => {
    state = (1664525 * state + 1013904223) >>> 0;
    return (state + 1) / 4294967297;
  };

  return () => {
    if (spare !== undefined) {
      const value = spare;
      spare = undefined;
      return value;
    }

    const first = uniform();
    const second = uniform();
    const radius = Math.sqrt(-2 * Math.log(first));
    const angle = 2 * Math.PI * second;
    spare = radius * Math.sin(angle);
    return radius * Math.cos(angle);
  };
}
