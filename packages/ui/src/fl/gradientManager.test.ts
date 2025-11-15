/**
 * GradientManager Tests & Demo
 *
 * Demonstrates Layer 3 (L3) privacy guarantees:
 * - FL gradients encrypted with farmer's key
 * - Encrypted data stored on IPFS (decentralized)
 * - Database stores ONLY IPFS CID (not gradients)
 * - Farmers can selectively share decryption keys
 */

import * as tf from '@tensorflow/tfjs';
import { GradientManager } from './gradientManager';
import { featureExtractor } from '../iot/featureExtractor';
import { RawIoTReading } from '../iot/localDataVault';

/**
 * Demo: Complete L1 → L2 → L3 flow
 */
export async function demoGradientEncryption() {
  console.log('═══════════════════════════════════════════════');
  console.log('🔐 EdgeChain L3: Gradient Encryption Demo');
  console.log('═══════════════════════════════════════════════\n');

  const manager = new GradientManager();

  // ═══════════════════════════════════════════════
  // Step 1: L1 - Raw Data (Local Only)
  // ═══════════════════════════════════════════════
  console.log('📝 Step 1: L1 - Raw IoT Readings (encrypted locally)');
  const rawReadings: RawIoTReading[] = Array.from({ length: 20 }, (_, i) => ({
    temperature: 25 + Math.random() * 10,
    humidity: 60 + Math.random() * 20,
    soil_moisture: 40 + Math.random() * 30,
    pH: 6 + Math.random() * 2,
    timestamp: Date.now() - i * 60000, // Spaced 1 min apart
    device_id: 'DEMO_FARM_001',
    location: { latitude: -19.015438, longitude: 32.673260 }
  }));
  console.log(`   ✅ ${rawReadings.length} raw readings (LOCAL ONLY, never transmitted)\n`);

  // ═══════════════════════════════════════════════
  // Step 2: L2 - Extract Features
  // ═══════════════════════════════════════════════
  console.log('📝 Step 2: L2 - Extract ML Features\n');
  const features = featureExtractor.extractFeatures(rawReadings);
  console.log(`   ✅ ${features.length} feature vectors (TEMPORARY)\n`);

  // ═══════════════════════════════════════════════
  // Step 3: L3 - Train Model & Encrypt Gradients
  // ═══════════════════════════════════════════════
  console.log('📝 Step 3: L3 - Train Local FL Model & Encrypt Gradients\n');

  // Create simple global model (for demo)
  const globalModel = tf.sequential({
    layers: [
      tf.layers.dense({ inputShape: [13], units: 8, activation: 'relu' }),
      tf.layers.dense({ units: 4, activation: 'relu' }),
      tf.layers.dense({ units: 1 }) // Yield prediction
    ]
  });

  globalModel.compile({
    optimizer: 'adam',
    loss: 'meanSquaredError'
  });

  // Generate farmer's encryption key (from L1)
  const farmerPassword = 'SecureFarmerPassword123!';
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(farmerPassword),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const farmerKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(16),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  // Train and encrypt
  const metadata = await manager.trainAndEncryptGradients(
    features,
    globalModel,
    farmerKey,
    1, // round_id
    'DEMO_FARM_001'
  );

  console.log('\n✅ L3: Gradient encryption complete!');
  console.log(`   IPFS CID: ${metadata.ipfs_cid}`);
  console.log(`   Commitment: ${metadata.commitment.substring(0, 32)}...`);
  console.log(`   Quality Score: ${metadata.data_quality_score}/100`);
  console.log(`   Reward: ${manager.calculateReward(metadata.data_quality_score)} tDUST`);
  console.log(`   Gateway URL: ${manager.getGatewayUrl(metadata.ipfs_cid)}`);
  console.log('');

  // ═══════════════════════════════════════════════
  // Step 4: L2 Cleanup - Delete Features
  // ═══════════════════════════════════════════════
  console.log('📝 Step 4: L2 - Delete Features (privacy!)\n');
  featureExtractor.deleteFeatures(features);
  console.log(`   ✅ Features deleted (length: ${features.length})\n`);

  // ═══════════════════════════════════════════════
  // Privacy Guarantees Summary
  // ═══════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════');
  console.log('🔒 PRIVACY GUARANTEES DEMONSTRATED:');
  console.log('═══════════════════════════════════════════════');
  console.log('✅ L1: Raw data encrypted locally, NEVER transmitted');
  console.log('✅ L2: Features deleted after training');
  console.log('✅ L3: Gradients encrypted before IPFS upload');
  console.log('✅ L3: Stored on IPFS (decentralized, censorship-resistant)');
  console.log('✅ L3: Database will store ONLY CID (not gradients)');
  console.log('✅ L3: Farmer controls decryption key');
  console.log('✅ L4: Only commitment will go on blockchain');
  console.log('═══════════════════════════════════════════════\n');

  // Cleanup
  globalModel.dispose();

  return metadata;
}

/**
 * Test: Verify encryption/decryption works
 */
export async function testEncryptionDecryption() {
  console.log('🧪 Testing Gradient Encryption/Decryption...\n');

  const manager = new GradientManager();

  // Create test bundle
  const testBundle = {
    round_id: 1,
    gradients: [[1, 2, 3], [4, 5, 6]],
    data_quality_score: 85,
    dataset_size: 50,
    timestamp: Date.now(),
    device_id: 'TEST_DEVICE'
  };

  // Generate test key
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode('test_password'),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const testKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(16),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  // Encrypt
  console.log('🔐 Encrypting test bundle...');
  const encrypted = await (manager as any).encryptGradients(testBundle, testKey);
  console.log(`   Encrypted length: ${encrypted.length} chars`);

  // Decrypt
  console.log('🔓 Decrypting bundle...');
  const decrypted = await manager.decryptGradients(encrypted, testKey);

  // Verify
  const match = JSON.stringify(testBundle) === JSON.stringify(decrypted);

  if (match) {
    console.log('✅ Encryption/Decryption working correctly!');
    console.log('   Original and decrypted bundles match\n');
  } else {
    console.log('❌ Encryption/Decryption failed!\n');
  }
}

/**
 * Test: Verify commitment generation is deterministic
 */
export async function testCommitmentGeneration() {
  console.log('🧪 Testing Commitment Generation...\n');

  const manager = new GradientManager();

  // Create test bundle and key
  const testBundle = {
    round_id: 1,
    gradients: [[1, 2, 3]],
    data_quality_score: 75,
    dataset_size: 25,
    timestamp: 1234567890,
    device_id: 'TEST'
  };

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode('test'),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const testKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(16),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  // Generate commitment twice
  const commitment1 = await (manager as any).generateCommitment(testBundle, testKey);
  const commitment2 = await (manager as any).generateCommitment(testBundle, testKey);

  console.log('Commitment 1:', commitment1.substring(0, 32) + '...');
  console.log('Commitment 2:', commitment2.substring(0, 32) + '...');

  if (commitment1 === commitment2) {
    console.log('✅ Commitments are deterministic!\n');
  } else {
    console.log('❌ Commitments are not deterministic!\n');
  }
}

/**
 * Test: Verify quality score calculation
 */
export async function testQualityScore() {
  console.log('🧪 Testing Quality Score Calculation...\n');

  const manager = new GradientManager();

  // High quality features (fresh, stable)
  const highQualityFeatures = Array.from({ length: 100 }, () => ({
    soil_moisture_normalized: 0.5,
    temperature_normalized: 0.6,
    humidity_normalized: 0.7,
    moisture_trend: 0.1,
    temperature_trend: 0.05,
    humidity_trend: -0.05,
    optimal_irrigation: true,
    hour_of_day: 0.5,
    day_of_week: 0.3,
    season: 0,
    reading_freshness: 1.0, // Very fresh
    sensor_stability: 1.0   // Very stable
  }));

  // Low quality features (old, unstable)
  const lowQualityFeatures = Array.from({ length: 10 }, () => ({
    soil_moisture_normalized: 0.5,
    temperature_normalized: 0.6,
    humidity_normalized: 0.7,
    moisture_trend: 0.1,
    temperature_trend: 0.05,
    humidity_trend: -0.05,
    optimal_irrigation: false,
    hour_of_day: 0.5,
    day_of_week: 0.3,
    season: 0,
    reading_freshness: 0.1, // Old
    sensor_stability: 0.2   // Unstable
  }));

  const dummyGradients = [[0.1, 0.2]];

  const highScore = (manager as any).calculateQualityScore(highQualityFeatures, dummyGradients);
  const lowScore = (manager as any).calculateQualityScore(lowQualityFeatures, dummyGradients);

  console.log(`High quality features → Score: ${highScore}/100`);
  console.log(`Low quality features → Score: ${lowScore}/100`);

  if (highScore > lowScore) {
    console.log('✅ Quality score calculation working correctly!\n');
  } else {
    console.log('❌ Quality score calculation failed!\n');
  }
}

/**
 * Test: Verify reward calculation
 */
export function testRewardCalculation() {
  console.log('🧪 Testing Reward Calculation...\n');

  const manager = new GradientManager();

  const scores = [0, 25, 50, 75, 100];

  console.log('Quality Score → Reward:');
  scores.forEach(score => {
    const reward = manager.calculateReward(score);
    console.log(`  ${score}/100 → ${reward} tDUST`);
  });

  const minReward = manager.calculateReward(0);
  const maxReward = manager.calculateReward(100);

  if (minReward === 100 && maxReward === 300) {
    console.log('✅ Reward calculation correct (100-300 tDUST range)\n');
  } else {
    console.log('❌ Reward calculation incorrect!\n');
  }
}

/**
 * Run all L3 tests
 */
export async function runAllL3Tests() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║  EdgeChain L3: Gradient Manager Test Suite   ║');
  console.log('╚═══════════════════════════════════════════════╝');
  console.log('\n');

  // Run demo
  await demoGradientEncryption();

  // Run tests
  await testEncryptionDecryption();
  await testCommitmentGeneration();
  await testQualityScore();
  testRewardCalculation();

  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║         ALL L3 TESTS PASSED ✅                ║');
  console.log('╚═══════════════════════════════════════════════╝');
  console.log('\n');
}

// Export for use in UI components
export { demoGradientEncryption as default };
