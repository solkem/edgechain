#!/usr/bin/env node
/**
 * EdgeChain Proof Server API Test Script
 * 
 * Tests all proof server endpoints
 * Run: node scripts/test-api.js
 */

const BASE_URL = process.env.PROOF_SERVER_URL || 'http://localhost:3002';

const results = [];

async function test(name, fn) {
    const start = Date.now();
    try {
        const response = await fn();
        results.push({
            name,
            passed: true,
            response,
            duration: Date.now() - start
        });
        console.log(`✅ ${name} (${Date.now() - start}ms)`);
    } catch (error) {
        results.push({
            name,
            passed: false,
            error: error.message,
            duration: Date.now() - start
        });
        console.log(`❌ ${name}: ${error.message}`);
    }
}

async function fetchJSON(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    });
    return response.json();
}

// Generate random hex string
function randomHex(bytes) {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < bytes * 2; i++) {
        result += chars[Math.floor(Math.random() * 16)];
    }
    return result;
}

async function runTests() {
    console.log('\n🧪 EdgeChain Proof Server API Tests\n');
    console.log(`Target: ${BASE_URL}\n`);
    console.log('─'.repeat(50));

    // Test 1: Health Check
    await test('Health Check', async () => {
        const res = await fetchJSON(`${BASE_URL}/health`);
        if (res.status !== 'healthy') throw new Error('Not healthy');
        return res;
    });

    // Test 2: Server Status
    await test('Server Status', async () => {
        const res = await fetchJSON(`${BASE_URL}/status`);
        if (!res.version) throw new Error('Missing version');
        return res;
    });

    // Test 3: Register Commitment
    const commitment = randomHex(32);
    await test('Register Commitment', async () => {
        const res = await fetchJSON(`${BASE_URL}/register-commitment`, {
            method: 'POST',
            body: JSON.stringify({ commitment })
        });
        if (!res.success) throw new Error(res.error || 'Registration failed');
        return res;
    });

    // Test 4: Get Merkle Proof
    await test('Get Merkle Proof', async () => {
        const res = await fetchJSON(`${BASE_URL}/merkle-proof/${commitment}`);
        if (!res.proof) throw new Error('No proof returned');
        return res;
    });

    // Test 5: Register Invalid Commitment (should fail gracefully)
    await test('Reject Invalid Commitment', async () => {
        const res = await fetchJSON(`${BASE_URL}/register-commitment`, {
            method: 'POST',
            body: JSON.stringify({ commitment: 'invalid' })
        });
        return res;
    });

    // Test 6: Claim Reward
    const nullifier = randomHex(32);
    const sensorDataHash = randomHex(32);
    await test('Claim Reward (ACR)', async () => {
        const res = await fetchJSON(`${BASE_URL}/claim-reward`, {
            method: 'POST',
            body: JSON.stringify({
                nullifier,
                proof: Buffer.from(JSON.stringify({ mock: true })).toString('base64'),
                sensorDataHash
            })
        });
        return res;
    });

    // Test 7: Double-Claim Same Nullifier (should be rejected)
    await test('Reject Replay Attack', async () => {
        const res = await fetchJSON(`${BASE_URL}/claim-reward`, {
            method: 'POST',
            body: JSON.stringify({
                nullifier,
                proof: Buffer.from(JSON.stringify({ mock: true })).toString('base64'),
                sensorDataHash
            })
        });
        if (res.success) throw new Error('Replay should be rejected');
        return res;
    });

    // Test 8: Register Multiple Commitments
    await test('Register 5 Commitments', async () => {
        const registered = [];
        for (let i = 0; i < 5; i++) {
            const res = await fetchJSON(`${BASE_URL}/register-commitment`, {
                method: 'POST',
                body: JSON.stringify({ commitment: randomHex(32) })
            });
            registered.push(res);
        }
        return { registered: registered.length };
    });

    // Test 9: Check Status After Operations
    await test('Status After Operations', async () => {
        const res = await fetchJSON(`${BASE_URL}/status`);
        console.log(`    └─ Devices: ${res.deviceCount}, Proofs: ${res.proofsGenerated}`);
        return res;
    });

    // Summary
    console.log('\n' + '─'.repeat(50));
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

    if (failed > 0) {
        console.log('Failed tests:');
        results.filter(r => !r.passed).forEach(r => {
            console.log(`  - ${r.name}: ${r.error}`);
        });
        process.exit(1);
    }

    console.log('🎉 All tests passed!\n');
}

// Run tests
runTests().catch(console.error);
