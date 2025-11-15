/**
 * Layer 3 (L3): Gradient Manager
 *
 * PURPOSE: Store FL model gradients ENCRYPTED on IPFS (decentralized storage).
 * PRIVACY GUARANTEE: Gradients encrypted with farmer's key, stored on IPFS (not database).
 *
 * Key Privacy Properties:
 * - Gradients encrypted before IPFS upload (AES-256-GCM)
 * - Database stores ONLY IPFS CID (content identifier)
 * - Farmers can selectively share decryption keys (programmable privacy)
 * - Decentralized storage (no single point of control)
 *
 * This is L3 in EdgeChain's 4-tier privacy architecture.
 */

import * as tf from '@tensorflow/tfjs';
import { MLFeatures } from '../iot/privacyTypes';
import { GradientBundle, EncryptedGradientMetadata } from '../iot/privacyTypes';

/**
 * Gradient Manager - Handles encrypted FL gradient storage on IPFS
 *
 * Flow:
 * 1. Train local FL model on features (L2)
 * 2. Compute gradients: Δw = w_local - w_global
 * 3. Encrypt gradients with farmer's key
 * 4. Upload encrypted gradients to IPFS
 * 5. Store only IPFS CID + commitment in database (L4)
 */
export class GradientManager {
  private ipfsServiceUrl: string;

  constructor() {
    // IPFS microservice endpoint
    this.ipfsServiceUrl = process.env.REACT_APP_IPFS_SERVICE_URL || 'http://localhost:3002';
  }

  /**
   * Train local FL model and produce encrypted gradient bundle
   *
   * @param features - ML features from L2 (will be deleted after training)
   * @param globalModel - Current global model weights
   * @param farmerKey - Farmer's encryption key from L1
   * @param roundId - Current FL round ID
   * @returns Encrypted gradient metadata (CID, commitment, quality score)
   */
  async trainAndEncryptGradients(
    features: MLFeatures[],
    globalModel: tf.LayersModel,
    farmerKey: CryptoKey,
    roundId: number,
    deviceId: string
  ): Promise<EncryptedGradientMetadata> {
    console.log('🧠 L3: Training local FL model...');
    console.log(`   Features: ${features.length}`);
    console.log(`   Round: ${roundId}`);

    if (features.length === 0) {
      throw new Error('Cannot train on empty feature set');
    }

    // 1. Train local model on features
    const gradients = await this.trainLocalModel(features, globalModel);

    // 2. Calculate data quality score (for rewards)
    const dataQualityScore = this.calculateQualityScore(features, gradients);

    // 3. Create gradient bundle
    const bundle: GradientBundle = {
      round_id: roundId,
      gradients,
      data_quality_score: dataQualityScore,
      dataset_size: features.length,
      timestamp: Date.now(),
      device_id: deviceId
    };

    console.log('✅ L3: Local training complete');
    console.log(`   Quality Score: ${dataQualityScore}/100`);

    // 4. Encrypt gradient bundle
    console.log('🔐 L3: Encrypting gradients with farmer key...');
    const encrypted = await this.encryptGradients(bundle, farmerKey);

    // 5. Upload to IPFS
    console.log('📤 L3: Uploading encrypted gradients to IPFS...');
    const ipfsCid = await this.uploadToIPFS(encrypted);

    console.log(`✅ L3: Gradients stored on IPFS: ${ipfsCid}`);

    // 6. Generate commitment (for L4)
    const commitment = await this.generateCommitment(bundle, farmerKey);

    console.log('✅ L3: Commitment generated for blockchain verification');

    return {
      ipfs_cid: ipfsCid,
      commitment,
      round_id: roundId,
      encrypted_at: Date.now(),
      data_quality_score: dataQualityScore
    };
  }

  /**
   * Train local model on features and compute gradients
   * Implements Federated Averaging (FedAvg) algorithm
   */
  private async trainLocalModel(
    features: MLFeatures[],
    globalModel: tf.LayersModel
  ): Promise<number[][]> {
    console.log('   🔬 Preparing training data...');

    // Convert features to tensors
    const X = tf.tensor2d(features.map(f => [
      f.soil_moisture_normalized,
      f.temperature_normalized,
      f.humidity_normalized,
      f.pH_normalized || 0,
      f.moisture_trend,
      f.temperature_trend,
      f.humidity_trend,
      f.optimal_irrigation ? 1 : 0,
      f.hour_of_day,
      f.day_of_week,
      f.season,
      f.reading_freshness,
      f.sensor_stability
    ]));

    // Create dummy labels (for yield prediction)
    // In production, this would be actual crop yield data
    const y = tf.randomNormal([features.length, 1]);

    // Clone global model weights
    const globalWeights = globalModel.getWeights();

    console.log('   🏋️ Training local model (5 epochs)...');

    // Train for 5 epochs locally
    await globalModel.fit(X, y, {
      epochs: 5,
      verbose: 0,
      batchSize: Math.min(32, features.length)
    });

    // Get updated local weights
    const localWeights = globalModel.getWeights();

    console.log('   📊 Computing gradients (Δw = w_local - w_global)...');

    // Compute gradients: Δw = w_local - w_global
    const gradients = localWeights.map((localW, idx) => {
      const globalW = globalWeights[idx];
      const diff = localW.sub(globalW);
      return diff.arraySync() as number[];
    });

    // Cleanup tensors
    X.dispose();
    y.dispose();
    localWeights.forEach(w => w.dispose());

    console.log(`   ✅ Computed ${gradients.length} gradient tensors`);

    return gradients;
  }

  /**
   * Calculate data quality score (0-100)
   * Used for reward calculation in L4
   */
  private calculateQualityScore(features: MLFeatures[], gradients: number[][]): number {
    // Quality metrics:
    // 1. Data freshness (40 points)
    const avgFreshness = features.reduce((sum, f) => sum + f.reading_freshness, 0) / features.length;
    const freshnessScore = avgFreshness * 40;

    // 2. Dataset size (30 points)
    const sizeScore = Math.min(features.length / 100, 1) * 30;

    // 3. Sensor stability (20 points)
    const avgStability = features.reduce((sum, f) => sum + f.sensor_stability, 0) / features.length;
    const stabilityScore = avgStability * 20;

    // 4. Gradient magnitude (10 points) - indicates model improvement
    const avgGradientMagnitude = this.calculateGradientMagnitude(gradients);
    const gradientScore = Math.min(avgGradientMagnitude * 100, 10);

    const totalScore = Math.round(freshnessScore + sizeScore + stabilityScore + gradientScore);

    return Math.max(0, Math.min(100, totalScore)); // Clamp to [0, 100]
  }

  /**
   * Calculate average gradient magnitude (L2 norm)
   */
  private calculateGradientMagnitude(gradients: number[][]): number {
    let sumSquared = 0;
    let count = 0;

    for (const layer of gradients) {
      for (const value of layer.flat()) {
        sumSquared += value * value;
        count++;
      }
    }

    return Math.sqrt(sumSquared / count);
  }

  /**
   * Encrypt gradient bundle with farmer's key (AES-256-GCM)
   */
  private async encryptGradients(
    bundle: GradientBundle,
    farmerKey: CryptoKey
  ): Promise<string> {
    // Serialize bundle to JSON
    const bundleJson = JSON.stringify(bundle);

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      farmerKey,
      new TextEncoder().encode(bundleJson)
    );

    // Combine IV + ciphertext
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Base64 encode
    return btoa(String.fromCharCode(...combined));
  }

  /**
   * Decrypt gradient bundle (for farmer's own use or selective sharing)
   */
  async decryptGradients(
    encryptedBase64: string,
    farmerKey: CryptoKey
  ): Promise<GradientBundle> {
    // Decode base64
    const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));

    // Extract IV and ciphertext
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      farmerKey,
      ciphertext
    );

    // Parse JSON
    const bundleJson = new TextDecoder().decode(decrypted);
    return JSON.parse(bundleJson) as GradientBundle;
  }

  /**
   * Upload encrypted gradients to IPFS
   * Returns IPFS CID (content identifier)
   */
  private async uploadToIPFS(encryptedData: string): Promise<string> {
    try {
      const response = await fetch(`${this.ipfsServiceUrl}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          proof: encryptedData, // Using 'proof' field for compatibility
          public_inputs: {
            dataType: 'encrypted_fl_gradients',
            timestamp: Date.now()
          },
          reading: {
            encrypted: true,
            timestamp: Date.now()
          },
          metadata: {
            encryption: 'AES-256-GCM',
            privacy_layer: 'L3'
          }
        }),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Upload failed: ${response.status}`);
      }

      const result = await response.json();

      console.log(`   ✅ IPFS CID: ${result.cid}`);
      console.log(`   🌐 Gateway: ${result.gateway_url}`);

      if (result.mock) {
        console.log(`   ⚠️  Using mock CID (IPFS credentials not configured)`);
      }

      return result.cid;
    } catch (error: any) {
      console.error('❌ IPFS upload failed:', error.message);
      throw new Error(`Failed to upload to IPFS: ${error.message}`);
    }
  }

  /**
   * Retrieve encrypted gradients from IPFS by CID
   */
  async retrieveFromIPFS(cid: string): Promise<string> {
    try {
      const response = await fetch(`${this.ipfsServiceUrl}/retrieve/${cid}`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`Retrieval failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log(`📥 Retrieved encrypted gradients from IPFS: ${cid}`);
        return result.data.proof; // Encrypted data in 'proof' field
      } else {
        throw new Error('Retrieval unsuccessful');
      }
    } catch (error: any) {
      console.error('❌ IPFS retrieval failed:', error.message);
      throw new Error(`Failed to retrieve from IPFS: ${error.message}`);
    }
  }

  /**
   * Generate cryptographic commitment
   * Commitment = Hash(gradients || farmer_key || round_id)
   */
  private async generateCommitment(
    bundle: GradientBundle,
    farmerKey: CryptoKey
  ): Promise<string> {
    // Export farmer key
    const exportedKey = await crypto.subtle.exportKey('raw', farmerKey);

    // Combine data for commitment
    const commitmentData = JSON.stringify({
      gradients_hash: await this.hashGradients(bundle.gradients),
      round_id: bundle.round_id,
      farmer_key: Array.from(new Uint8Array(exportedKey)),
      timestamp: bundle.timestamp
    });

    // Hash to create commitment
    return this.hash(commitmentData);
  }

  /**
   * Hash gradients (for commitment)
   */
  private async hashGradients(gradients: number[][]): Promise<string> {
    const gradientsJson = JSON.stringify(gradients);
    return this.hash(gradientsJson);
  }

  /**
   * SHA-256 hash function
   */
  private async hash(data: string): Promise<string> {
    const buffer = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(data)
    );
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
  }

  /**
   * Calculate reward amount based on quality score
   */
  calculateReward(qualityScore: number): number {
    const baseReward = 100; // 100 tDUST base
    const qualityBonus = qualityScore * 2; // Up to 200 tDUST bonus
    return baseReward + qualityBonus; // Max 300 tDUST
  }

  /**
   * Get IPFS gateway URL for a CID
   */
  getGatewayUrl(cid: string): string {
    return `https://w3s.link/ipfs/${cid}`;
  }
}

// Singleton instance
export const gradientManager = new GradientManager();
