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

async function testDatabaseAuditPersistence() {
  await initializeDatabase();

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
    await nullifierService.markNullifierSpent(
      nullifier,
      epoch,
      'test_data_hash',
      rewardDecision.reward,
      rewardDecision.score,
    );

    const spentResult = await db.query(`
      SELECT reward, mars_action, mars_composite, mars_score_json
      FROM spent_nullifiers
      WHERE nullifier = $1 AND epoch = $2
    `, [nullifier, epoch]);
    const spent = spentResult.rows[0] as {
      reward: number;
      mars_action: string;
      mars_composite: number;
      mars_score_json: string;
    };

    assert.equal(spent.reward, rewardDecision.reward);
    assert.equal(spent.mars_action, rewardDecision.score.action);
    assert.equal(spent.mars_composite, rewardDecision.score.composite);
    assert.deepEqual(JSON.parse(spent.mars_score_json), rewardDecision.score);

    await db.query(`
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
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [
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
      true,
    ]);

    const zkSubmissionResult = await db.query(`
      SELECT reward, collection_mode, mars_action, mars_composite, mars_score_json
      FROM zk_proof_submissions
      WHERE nullifier = $1 AND epoch = $2
    `, [zkNullifier, epoch]);
    const zkSubmission = zkSubmissionResult.rows[0] as {
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
    await db.query('DELETE FROM spent_nullifiers WHERE nullifier = $1 AND epoch = $2', [nullifier, epoch]);
    await db.query('DELETE FROM zk_proof_submissions WHERE nullifier = $1 AND epoch = $2', [zkNullifier, epoch]);
  }
}

testSensorRewards();
testDatabaseAuditPersistence()
  .then(() => {
    console.log('MARS scoring and audit persistence tests passed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
