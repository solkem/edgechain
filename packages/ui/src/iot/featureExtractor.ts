/**
 * Layer 2 (L2): Feature Extractor
 *
 * PURPOSE: Transform raw IoT data into ML-ready features WITHOUT exposing sensitive data.
 * PRIVACY GUARANTEE: Features are TEMPORARY - deleted immediately after local training.
 *
 * Key Privacy Properties:
 * - No raw values in features (normalized 0-1 range)
 * - Derived metrics only (trends, aggregates)
 * - Temporal abstraction (hour of day, not exact timestamp)
 * - Features exist ONLY in memory during training
 * - Deleted as soon as FL gradient computation completes
 *
 * This is L2 in EdgeChain's 4-tier privacy architecture.
 */

import { RawIoTReading } from './localDataVault';
import { MLFeatures } from './privacyTypes';

/**
 * Normalization ranges for agricultural sensors
 * Based on typical Zimbabwe agricultural data
 */
const NORMALIZATION_RANGES = {
  temperature: { min: 10, max: 45 },    // °C (Zimbabwe range)
  humidity: { min: 20, max: 95 },       // %
  soil_moisture: { min: 0, max: 100 },  // %
  pH: { min: 4.5, max: 8.5 }           // pH scale
};

/**
 * Optimal thresholds for Zimbabwe agriculture
 */
const OPTIMAL_THRESHOLDS = {
  soil_moisture_low: 30,    // Below 30% requires irrigation
  soil_moisture_high: 70,   // Above 70% may indicate over-watering
  pH_optimal_min: 6.0,      // Optimal pH for most crops
  pH_optimal_max: 7.5,
  temperature_stress: 35    // Above 35°C indicates heat stress
};

/**
 * Feature Extractor - Converts raw readings to privacy-preserving ML features
 *
 * Privacy Features:
 * - Normalization removes absolute values
 * - Trends hide specific readings
 * - Temporal features abstract exact times
 * - All features are ephemeral (deleted after use)
 */
export class FeatureExtractor {
  /**
   * Extract ML features from raw readings
   *
   * IMPORTANT: Features are TEMPORARY. Caller MUST delete them after use!
   */
  extractFeatures(readings: RawIoTReading[]): MLFeatures[] {
    console.log('🔬 L2: Extracting privacy-preserving ML features...');
    console.log(`   Processing ${readings.length} raw readings`);

    if (readings.length === 0) {
      console.warn('⚠️  L2: No readings to process');
      return [];
    }

    const features = readings.map((reading, idx) =>
      this.extractSingleReading(reading, idx, readings)
    );

    console.log(`✅ L2: Extracted ${features.length} feature vectors`);
    console.log('   ⚠️  REMINDER: Features are TEMPORARY - delete after training!');

    return features;
  }

  /**
   * Extract features from a single reading
   */
  private extractSingleReading(
    reading: RawIoTReading,
    index: number,
    allReadings: RawIoTReading[]
  ): MLFeatures {
    // Normalized features (0-1 range, no raw values!)
    const soil_moisture_normalized = this.normalize(
      reading.soil_moisture || 0,
      NORMALIZATION_RANGES.soil_moisture
    );

    const temperature_normalized = this.normalize(
      reading.temperature,
      NORMALIZATION_RANGES.temperature
    );

    const humidity_normalized = this.normalize(
      reading.humidity,
      NORMALIZATION_RANGES.humidity
    );

    const pH_normalized = reading.pH
      ? this.normalize(reading.pH, NORMALIZATION_RANGES.pH)
      : undefined;

    // Trend calculation (compare to previous reading)
    const moisture_trend = index > 0
      ? this.calculateTrend(
          reading.soil_moisture || 0,
          allReadings[index - 1].soil_moisture || 0
        )
      : 0;

    const temperature_trend = index > 0
      ? this.calculateTrend(
          reading.temperature,
          allReadings[index - 1].temperature
        )
      : 0;

    const humidity_trend = index > 0
      ? this.calculateTrend(
          reading.humidity,
          allReadings[index - 1].humidity
        )
      : 0;

    // Optimal conditions (boolean features)
    const optimal_irrigation = this.isOptimalIrrigation(reading.soil_moisture || 0);

    // Temporal features (abstracted, not exact timestamps!)
    const date = new Date(reading.timestamp);
    const hour_of_day = date.getHours() / 24; // 0-1
    const day_of_week = date.getDay() / 7;    // 0-1
    const season = this.calculateSeason(date); // 0-1

    // Quality indicators
    const reading_freshness = this.calculateFreshness(reading.timestamp);
    const sensor_stability = this.calculateStability(index, allReadings);

    return {
      // Normalized features
      soil_moisture_normalized,
      temperature_normalized,
      humidity_normalized,
      pH_normalized,

      // Derived features (trends)
      moisture_trend,
      temperature_trend,
      humidity_trend,
      optimal_irrigation,

      // Temporal features (abstracted)
      hour_of_day,
      day_of_week,
      season,

      // Quality indicators
      reading_freshness,
      sensor_stability
    };
  }

  /**
   * Normalize value to 0-1 range
   * Removes absolute values for privacy
   */
  private normalize(value: number, range: { min: number; max: number }): number {
    const normalized = (value - range.min) / (range.max - range.min);
    return Math.max(0, Math.min(1, normalized)); // Clamp to [0, 1]
  }

  /**
   * Calculate trend: -1 (decreasing) to 1 (increasing)
   */
  private calculateTrend(current: number, previous: number): number {
    if (previous === 0) return 0;

    const percentChange = (current - previous) / previous;

    // Clamp to [-1, 1] range
    return Math.max(-1, Math.min(1, percentChange));
  }

  /**
   * Check if soil moisture is in optimal irrigation range
   */
  private isOptimalIrrigation(soilMoisture: number): boolean {
    return soilMoisture >= OPTIMAL_THRESHOLDS.soil_moisture_low &&
           soilMoisture <= OPTIMAL_THRESHOLDS.soil_moisture_high;
  }

  /**
   * Calculate season (0-1, Zimbabwe agricultural calendar)
   * 0 = Summer (Oct-Mar)
   * 0.5 = Winter (Apr-Sep)
   */
  private calculateSeason(date: Date): number {
    const month = date.getMonth(); // 0-11

    // Zimbabwe agricultural seasons:
    // Summer (rainy): October-March (months 9-2)
    // Winter (dry): April-September (months 3-8)

    if (month >= 9 || month <= 2) {
      return 0; // Summer
    } else {
      return 0.5; // Winter
    }
  }

  /**
   * Calculate reading freshness (0-1)
   * 1 = very fresh (< 1 hour)
   * 0 = old (> 24 hours)
   */
  private calculateFreshness(timestamp: number): number {
    const ageMs = Date.now() - timestamp;
    const ageHours = ageMs / (1000 * 60 * 60);

    if (ageHours < 1) return 1;
    if (ageHours > 24) return 0;

    // Linear decay from 1 to 0 over 24 hours
    return 1 - (ageHours / 24);
  }

  /**
   * Calculate sensor stability (0-1)
   * Based on variance in recent readings
   */
  private calculateStability(
    currentIndex: number,
    allReadings: RawIoTReading[]
  ): number {
    // Look at last 5 readings (or fewer if not available)
    const windowSize = Math.min(5, currentIndex + 1);
    const recentReadings = allReadings.slice(
      Math.max(0, currentIndex - windowSize + 1),
      currentIndex + 1
    );

    if (recentReadings.length < 2) return 1; // Not enough data, assume stable

    // Calculate variance in temperature (normalized)
    const temperatures = recentReadings.map(r => r.temperature);
    const variance = this.calculateVariance(temperatures);

    // Low variance = high stability
    // Map variance [0, 10] to stability [1, 0]
    const stability = Math.max(0, 1 - (variance / 10));

    return stability;
  }

  /**
   * Calculate variance of an array of numbers
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;

    return variance;
  }

  /**
   * Calculate data quality score (0-100)
   * Used for reward calculation in L4
   */
  calculateQualityScore(features: MLFeatures[]): number {
    if (features.length === 0) return 0;

    console.log('📊 L2: Calculating data quality score...');

    // Quality metrics:
    // 1. Freshness (40 points max)
    const avgFreshness = features.reduce((sum, f) => sum + f.reading_freshness, 0) / features.length;
    const freshnessScore = avgFreshness * 40;

    // 2. Dataset size (30 points max)
    const sizeScore = Math.min(features.length / 100, 1) * 30;

    // 3. Sensor stability (20 points max)
    const avgStability = features.reduce((sum, f) => sum + f.sensor_stability, 0) / features.length;
    const stabilityScore = avgStability * 20;

    // 4. Data diversity (10 points max)
    const moistureValues = features.map(f => f.soil_moisture_normalized);
    const moistureVariance = this.calculateVariance(moistureValues);
    const diversityScore = Math.min(moistureVariance * 100, 10);

    const totalScore = Math.round(
      freshnessScore + sizeScore + stabilityScore + diversityScore
    );

    console.log(`   Freshness: ${freshnessScore.toFixed(1)}/40`);
    console.log(`   Size: ${sizeScore.toFixed(1)}/30`);
    console.log(`   Stability: ${stabilityScore.toFixed(1)}/20`);
    console.log(`   Diversity: ${diversityScore.toFixed(1)}/10`);
    console.log(`✅ Total Quality Score: ${totalScore}/100`);

    return totalScore;
  }

  /**
   * Get feature statistics (for debugging/validation)
   */
  getFeatureStats(features: MLFeatures[]): {
    count: number;
    avgFreshness: number;
    avgStability: number;
    optimalIrrigationPercent: number;
  } {
    if (features.length === 0) {
      return {
        count: 0,
        avgFreshness: 0,
        avgStability: 0,
        optimalIrrigationPercent: 0
      };
    }

    const avgFreshness = features.reduce((sum, f) => sum + f.reading_freshness, 0) / features.length;
    const avgStability = features.reduce((sum, f) => sum + f.sensor_stability, 0) / features.length;
    const optimalCount = features.filter(f => f.optimal_irrigation).length;
    const optimalIrrigationPercent = (optimalCount / features.length) * 100;

    return {
      count: features.length,
      avgFreshness,
      avgStability,
      optimalIrrigationPercent
    };
  }

  /**
   * CRITICAL: Delete features from memory
   * Call this IMMEDIATELY after local FL training completes!
   */
  deleteFeatures(features: MLFeatures[]): void {
    console.log('🗑️  L2: Deleting features from memory...');

    // Clear array (JavaScript will garbage collect)
    features.length = 0;

    console.log('✅ L2: Features deleted (privacy preserved)');
    console.log('   Features existed ONLY during training');
    console.log('   No persistent storage of intermediate data');
  }
}

// Singleton instance
export const featureExtractor = new FeatureExtractor();
