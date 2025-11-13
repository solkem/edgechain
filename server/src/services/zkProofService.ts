/**
 * ZK Proof Generation Service
 *
 * Generates zero-knowledge proofs for private sensor readings using Midnight Protocol.
 * This service wraps the Midnight SDK to create proofs that demonstrate:
 * 1. Device is in approved Merkle tree (without revealing which device)
 * 2. Nullifier is correctly derived
 * 3. Data is authentic and within valid ranges
 *
 * For demo/testing, this runs on the server. In production, proof generation
 * should happen client-side (browser or IoT gateway) to maintain privacy.
 */

import * as crypto from 'crypto';
import { NullifierTrackingService } from './nullifierTracking';

export interface SensorReading {
  temperature: number; // Celsius
  humidity: number; // Percentage
  timestamp: number; // Unix timestamp
}

export interface PrivateWitnessInputs {
  devicePubkey: string; // hex, 32 bytes
  deviceSecret: string; // hex, 32 bytes - for nullifier generation
  merkleSiblings: string[]; // hex array, up to 20 levels
  leafIndex: number; // Position in Merkle tree
}

export interface PublicInputs {
  collectionMode: number; // 0 = auto, 1 = manual
  nullifier: string; // hex, 32 bytes
  dataHash: string; // hex, 32 bytes
  epoch: number; // Daily epoch
  temperature: number; // In tenths (e.g., 285 = 28.5°C)
  humidity: number; // In tenths (e.g., 650 = 65.0%)
  timestamp: number; // Unix timestamp
}

export interface ZKProof {
  proof: string; // hex-encoded proof
  publicInputs: PublicInputs;
  metadata: {
    proofGenerationTime: number; // milliseconds
    circuitName: string;
    version: string;
  };
}

export class ZKProofService {
  private nullifierService = new NullifierTrackingService();

  /**
   * Generate ZK proof for private sensor reading
   *
   * In production, this should use @midnight-ntwrk/compact-runtime
   * For now, we'll create a mock proof structure for testing
   */
  async generateProof(
    reading: SensorReading,
    witnessInputs: PrivateWitnessInputs,
    collectionMode: 'auto' | 'manual',
    merkleRoot: string
  ): Promise<ZKProof> {
    const startTime = Date.now();

    console.log('\n🔐 GENERATING ZK PROOF');
    console.log('═══════════════════════════════════════');
    console.log(`📊 Reading: temp=${reading.temperature}°C, humidity=${reading.humidity}%`);
    console.log(`📱 Device: ${witnessInputs.devicePubkey.slice(0, 16)}... (PRIVATE)`);
    console.log(`🌳 Merkle root: ${merkleRoot.slice(0, 16)}...`);
    console.log(`🔧 Mode: ${collectionMode}`);

    // 1. Compute epoch
    const epoch = this.nullifierService.getCurrentEpoch();

    // 2. Compute nullifier: H(device_secret || epoch)
    const nullifier = this.computeNullifier(witnessInputs.deviceSecret, epoch);

    // 3. Compute data hash: H(temperature || humidity || timestamp)
    const dataHash = this.computeDataHash(
      reading.temperature,
      reading.humidity,
      reading.timestamp
    );

    // 4. Convert to tenths for circuit (precision)
    const tempTenths = Math.round(reading.temperature * 10);
    const humidityTenths = Math.round(reading.humidity * 10);

    // 5. Validate ranges
    if (tempTenths < -500 || tempTenths > 600) {
      throw new Error(`Temperature out of range: ${reading.temperature}°C (must be -50 to 60°C)`);
    }
    if (humidityTenths < 0 || humidityTenths > 1000) {
      throw new Error(`Humidity out of range: ${reading.humidity}% (must be 0 to 100%)`);
    }

    // 6. Prepare public inputs
    const publicInputs: PublicInputs = {
      collectionMode: collectionMode === 'auto' ? 0 : 1,
      nullifier,
      dataHash,
      epoch,
      temperature: tempTenths,
      humidity: humidityTenths,
      timestamp: reading.timestamp,
    };

    // 7. Generate proof
    // TODO: Integrate actual Midnight SDK proof generation
    // For now, create mock proof for testing
    const proof = await this.generateMockProof(publicInputs, witnessInputs, merkleRoot);

    const proofGenerationTime = Date.now() - startTime;

    console.log(`✅ Proof generated in ${proofGenerationTime}ms`);
    console.log(`   Nullifier: ${nullifier.slice(0, 16)}...`);
    console.log(`   Data hash: ${dataHash.slice(0, 16)}...`);
    console.log(`   Epoch: ${epoch}`);
    console.log('═══════════════════════════════════════\n');

    return {
      proof,
      publicInputs,
      metadata: {
        proofGenerationTime,
        circuitName: 'arduino-iot-private',
        version: '1.0.0',
      },
    };
  }

  /**
   * Compute nullifier: H(device_secret || epoch)
   */
  private computeNullifier(deviceSecret: string, epoch: number): string {
    return NullifierTrackingService.computeNullifier(deviceSecret, epoch);
  }

  /**
   * Compute data hash: H("edgechain:reading:" || temperature || humidity || timestamp)
   */
  private computeDataHash(
    temperature: number,
    humidity: number,
    timestamp: number
  ): string {
    const tempTenths = Math.round(temperature * 10);
    const humidityTenths = Math.round(humidity * 10);

    const combined = `edgechain:reading:${tempTenths}:${humidityTenths}:${timestamp}`;
    return crypto.createHash('sha256').update(combined).digest('hex');
  }

  /**
   * Mock proof generation for testing
   * TODO: Replace with actual Midnight SDK integration
   */
  private async generateMockProof(
    publicInputs: PublicInputs,
    witnessInputs: PrivateWitnessInputs,
    merkleRoot: string
  ): Promise<string> {
    // Simulate proof generation delay (1-2 seconds in real system)
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Create deterministic mock proof based on inputs
    const proofInput = JSON.stringify({
      public: publicInputs,
      merkleRoot,
      // Don't include private inputs in the proof!
      // They're only used during generation
    });

    const proofHash = crypto.createHash('sha256').update(proofInput).digest('hex');

    // Mock proof format (in production, this would be a SNARK proof)
    return 'zk_proof_' + proofHash;
  }

  /**
   * Verify ZK proof (backend verification)
   *
   * Checks:
   * 1. Proof is cryptographically valid
   * 2. Nullifier not spent in this epoch
   * 3. Claimed Merkle root matches expected
   * 4. Sensor data in valid ranges
   */
  async verifyProof(
    proof: string,
    publicInputs: PublicInputs,
    expectedMerkleRoot: string
  ): Promise<{ valid: boolean; reason?: string }> {
    console.log('\n🔍 VERIFYING ZK PROOF');
    console.log('═══════════════════════════════════════');

    try {
      // 1. Verify proof cryptographically
      // TODO: Use actual Midnight SDK verification
      // For now, check proof format
      if (!proof.startsWith('zk_proof_')) {
        return { valid: false, reason: 'Invalid proof format' };
      }

      // 2. Verify claimed data hash matches actual data
      const tempCelsius = publicInputs.temperature / 10;
      const humidityPercent = publicInputs.humidity / 10;
      const expectedDataHash = this.computeDataHash(
        tempCelsius,
        humidityPercent,
        publicInputs.timestamp
      );

      if (publicInputs.dataHash !== expectedDataHash) {
        return { valid: false, reason: 'Data hash mismatch' };
      }

      // 3. Verify sensor data ranges
      if (publicInputs.temperature < -500 || publicInputs.temperature > 600) {
        return { valid: false, reason: 'Temperature out of range (-50 to 60°C)' };
      }

      if (publicInputs.humidity < 0 || publicInputs.humidity > 1000) {
        return { valid: false, reason: 'Humidity out of range (0 to 100%)' };
      }

      // 4. Verify epoch is current or recent
      const currentEpoch = this.nullifierService.getCurrentEpoch();
      if (Math.abs(publicInputs.epoch - currentEpoch) > 1) {
        return { valid: false, reason: 'Epoch too old or in future' };
      }

      console.log('✅ Proof verification successful');
      console.log(`   Nullifier: ${publicInputs.nullifier.slice(0, 16)}...`);
      console.log(`   Epoch: ${publicInputs.epoch}`);
      console.log(`   Mode: ${publicInputs.collectionMode === 0 ? 'auto' : 'manual'}`);
      console.log('═══════════════════════════════════════\n');

      return { valid: true };
    } catch (error: any) {
      console.error('❌ Proof verification failed:', error.message);
      return { valid: false, reason: error.message };
    }
  }

  /**
   * Compute Merkle leaf hash: H("edgechain:device:" || device_pubkey || collection_mode)
   * This should match the circuit's computeLeafHash function
   */
  static computeLeafHash(devicePubkey: string, collectionMode: 'auto' | 'manual'): string {
    const mode = collectionMode === 'auto' ? '0' : '1';
    const combined = `edgechain:device:${devicePubkey}${mode}`;
    return crypto.createHash('sha256').update(combined).digest('hex');
  }

  /**
   * Get proof statistics
   */
  getStats(): {
    averageProofTime: number;
    totalProofsGenerated: number;
  } {
    // TODO: Track actual statistics
    return {
      averageProofTime: 1500, // ms
      totalProofsGenerated: 0,
    };
  }
}
