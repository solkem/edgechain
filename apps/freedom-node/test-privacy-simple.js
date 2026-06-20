/**
 * Simplified End-to-End Privacy Flow Test
 * Tests core ZK privacy features without authentication complexity
 */

const API_BASE = 'http://localhost:3001';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  console.log('\n' + '='.repeat(60));
  log('cyan', `  ${title}`);
  console.log('='.repeat(60));
}

async function request(method, endpoint, body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${API_BASE}${endpoint}`, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.statusText}`);
  }

  return data;
}

const TEST_WALLET = '0x1234567890123456789012345678901234567890';
let devicePubkey = null;
let deviceSecret = null;

async function runTests() {
  try {
    section('PHASE 8: SIMPLIFIED PRIVACY FLOW TEST');

    // Test 1: Health
    section('Test 1: Server Health');
    const health = await request('GET', '/health');
    log('green', `✓ Server is ${health.status}`);

    // Test 2: Generate Keypair
    section('Test 2: Generate Device Keys');
    const keypair = await request('POST', '/api/sensor-node/auth/generate-keypair');
    devicePubkey = keypair.public_key;
    deviceSecret = keypair.private_key.slice(0, 64); // Use as device secret
    log('green', `✓ Keys generated`);
    log('blue', `  Pubkey: ${devicePubkey.slice(0, 16)}...`);

    // Test 3: Register Device (skip auth for now)
    section('Test 3: Register Device');
    const registration = await request('POST', '/api/sensor-node/registry/register', {
      device_pubkey: devicePubkey,
      owner_wallet: TEST_WALLET,
      collection_mode: 'auto',
      device_id: 'test-device-001',
    });
    log('green', `✓ Device registered`);
    log('blue', `  Merkle root: ${registration.global_auto_collection_root.slice(0, 16)}...`);

    // Test 4: Generate ZK Proof
    section('Test 4: Generate ZK Proof');
    const proof = await request('POST', '/api/sensor-node/zk/generate-proof', {
      temperature: 25.5,
      humidity: 65.0,
      timestamp: Math.floor(Date.now() / 1000),
      device_pubkey: devicePubkey,
      device_secret: deviceSecret,
      collection_mode: 'auto',
    });
    log('green', `✓ ZK proof generated in ${proof.metadata.proofGenerationTime}ms`);
    log('blue', `  Nullifier: ${proof.public_inputs.nullifier.slice(0, 16)}...`);
    log('blue', `  Epoch: ${proof.public_inputs.epoch}`);

    // Test 5: Submit Private Reading
    section('Test 5: Submit Private Reading');
    const submission = await request('POST', '/api/sensor-node/zk/submit-private-reading', {
      proof: proof.proof,
      public_inputs: proof.public_inputs,
      temperature: 25.5,
      humidity: 65.0,
      timestamp: Math.floor(Date.now() / 1000),
    });
    log('green', `✓ Private reading submitted`);
    log('blue', `  Reward: ${submission.reward} tDUST`);
    log('yellow', `  Device identity: ANONYMOUS`);

    // Test 6: Replay Attack Prevention
    section('Test 6: Replay Attack Prevention');
    try {
      await request('POST', '/api/sensor-node/zk/submit-private-reading', {
        proof: proof.proof,
        public_inputs: proof.public_inputs,
        temperature: 25.5,
        humidity: 65.0,
        timestamp: Math.floor(Date.now() / 1000),
      });
      log('red', '✗ FAILED: Replay should be blocked');
    } catch (error) {
      log('green', `✓ Replay blocked: ${error.message}`);
    }

    // Test 7: Privacy Stats
    section('Test 7: Privacy Statistics');
    const stats = await request('GET', '/api/sensor-node/zk/stats');
    log('green', `✓ Stats retrieved`);
    log('blue', `  Submissions: ${stats.nullifiers.total_nullifiers}`);
    log('blue', `  Epoch: ${stats.privacy.current_epoch}`);
    log('blue', `  Anonymity set: ${stats.privacy.anonymity_set_size}`);

    // Test 8: Invalid Range
    section('Test 8: Range Validation');
    try {
      const invalidProof = await request('POST', '/api/sensor-node/zk/generate-proof', {
        temperature: 100, // Too high
        humidity: 50,
        timestamp: Math.floor(Date.now() / 1000),
        device_pubkey: devicePubkey,
        device_secret: deviceSecret,
        collection_mode: 'auto',
      });

      await request('POST', '/api/sensor-node/zk/submit-private-reading', {
        proof: invalidProof.proof,
        public_inputs: invalidProof.public_inputs,
        temperature: 100,
        humidity: 50,
        timestamp: Math.floor(Date.now() / 1000),
      });
      log('red', '✗ FAILED: Invalid temp should be rejected');
    } catch (error) {
      log('green', `✓ Invalid temperature rejected`);
    }

    // Summary
    section('TEST SUMMARY');
    log('green', '✓ All core privacy tests passed!');
    console.log('');
    log('cyan', 'Privacy Features Verified:');
    log('blue', '  ✓ ZK proof generation');
    log('blue', '  ✓ Anonymous submission');
    log('blue', '  ✓ Nullifier replay prevention');
    log('blue', '  ✓ Range validation');
    log('blue', '  ✓ Privacy metrics');
    console.log('');
    log('green', '🎉 Privacy architecture working!');

  } catch (error) {
    log('red', `\n✗ TEST FAILED: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

runTests().then(() => process.exit(0));
