import assert from 'assert';
import { initializeDatabase, getDatabase } from './database';
import { MarsScoringService } from './services/marsScoring';
import { NullifierTrackingService } from './services/nullifierTracking';

const scoring = new MarsScoringService();

function testSensorRewards() {
  const normalAuto = scoring.calculateSensorReward({
    siteId: 'site-test-auto',
    roundId: 1,
    temperature: 25,
    humidity: 65,
    collectionMode: 'auto',
    hasValidAttestation: true,
  });

  assert.equal(normalAuto.reward, 0.1);
  assert.equal(normalAuto.rewardUnit, 'tDUST');
  assert.equal(normalAuto.score.action, 'accept');
  assert.equal(normalAuto.score.eligibleForReward, true);

  const normalManual = scoring.calculateSensorReward({
    siteId: 'site-test-manual',
    roundId: 1,
    temperature: 25,
    humidity: 65,
    collectionMode: 'manual',
    hasValidAttestation: true,
  });

  assert.equal(normalManual.reward, 0.02);
  assert.equal(normalManual.score.action, 'accept');

  const invalidAttestation = scoring.calculateSensorReward({
    siteId: 'site-test-invalid',
    roundId: 1,
    temperature: 25,
    humidity: 65,
    collectionMode: 'auto',
    hasValidAttestation: false,
  });

  assert.equal(invalidAttestation.reward, 0);
  assert.equal(invalidAttestation.score.action, 'reject');
  assert.equal(invalidAttestation.score.composite, 0);

  const impossibleReading = scoring.calculateSensorReward({
    siteId: 'site-test-impossible',
    roundId: 1,
    temperature: 80,
    humidity: 65,
    collectionMode: 'auto',
    hasValidAttestation: true,
  });

  assert.equal(impossibleReading.reward, 0);
  assert.equal(impossibleReading.score.eligibleForReward, false);
}

function testDatabaseAuditPersistence() {
  initializeDatabase();

  const db = getDatabase();
  const nullifierService = new NullifierTrackingService();
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const nullifier = `test_nullifier_${suffix}`;
  const zkNullifier = `test_zk_${suffix}`;
  const epoch = nullifierService.getCurrentEpoch();

  const rewardDecision = scoring.calculateSensorReward({
    siteId: 'site-test-db',
    roundId: epoch,
    temperature: 25,
    humidity: 65,
    collectionMode: 'auto',
    hasValidAttestation: true,
  });

  try {
    nullifierService.markNullifierSpent(
      nullifier,
      epoch,
      'test_data_hash',
      rewardDecision.reward,
      rewardDecision.score,
    );

    const spent = db.prepare(`
      SELECT reward, mars_action, mars_composite, mars_score_json
      FROM spent_nullifiers
      WHERE nullifier = ? AND epoch = ?
    `).get(nullifier, epoch) as {
      reward: number;
      mars_action: string;
      mars_composite: number;
      mars_score_json: string;
    };

    assert.equal(spent.reward, rewardDecision.reward);
    assert.equal(spent.mars_action, rewardDecision.score.action);
    assert.equal(spent.mars_composite, rewardDecision.score.composite);
    assert.deepEqual(JSON.parse(spent.mars_score_json), rewardDecision.score);

    db.prepare(`
      INSERT INTO zk_proof_submissions (
        nullifier,
        epoch,
        proof_data,
        public_inputs,
        temperature,
        humidity,
        timestamp_device,
        collection_mode,
        reward,
        mars_action,
        mars_composite,
        mars_score_json,
        verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      zkNullifier,
      epoch,
      'test_proof',
      JSON.stringify({ test: true }),
      25,
      65,
      Date.now(),
      'auto',
      rewardDecision.reward,
      rewardDecision.score.action,
      rewardDecision.score.composite,
      JSON.stringify(rewardDecision.score),
      1,
    );

    const zkSubmission = db.prepare(`
      SELECT reward, collection_mode, mars_action, mars_composite, mars_score_json
      FROM zk_proof_submissions
      WHERE nullifier = ? AND epoch = ?
    `).get(zkNullifier, epoch) as {
      reward: number;
      collection_mode: string;
      mars_action: string;
      mars_composite: number;
      mars_score_json: string;
    };

    assert.equal(zkSubmission.reward, rewardDecision.reward);
    assert.equal(zkSubmission.collection_mode, 'auto');
    assert.equal(zkSubmission.mars_action, rewardDecision.score.action);
    assert.equal(zkSubmission.mars_composite, rewardDecision.score.composite);
    assert.deepEqual(JSON.parse(zkSubmission.mars_score_json), rewardDecision.score);
  } finally {
    db.prepare('DELETE FROM spent_nullifiers WHERE nullifier = ? AND epoch = ?').run(nullifier, epoch);
    db.prepare('DELETE FROM zk_proof_submissions WHERE nullifier = ? AND epoch = ?').run(zkNullifier, epoch);
  }
}

testSensorRewards();
testDatabaseAuditPersistence();

console.log('MARS scoring and audit persistence tests passed.');
