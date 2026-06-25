import assert from 'assert';
import { authService } from './auth/authService';
import { getDatabase, initializeDatabase } from './database';
import { demoService } from './virtual-ndani/demoService';
import { evidenceService } from './virtual-ndani/evidenceService';
import { operationsService } from './virtual-ndani/operationsService';
import { virtualNdaniService } from './virtual-ndani/service';

async function run(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required for the demo isolation integration test');
  }
  await initializeDatabase();
  const db = getDatabase();
  const suffix = `${Date.now()}`.slice(-8) + Math.floor(Math.random() * 100);
  const siteNumber = 100 + Math.floor(Math.random() * 800);
  let farmerId: string | undefined;
  let otherFarmerId: string | undefined;
  let farmId: string | undefined;
  let otherFarmId: string | undefined;

  try {
    const farmer = await authService.enroll({
      pilotCode: `DA-${suffix}`,
      displayName: 'Demo Isolation Farmer',
      preferredLanguage: 'sn-en',
      pin: '2048',
      siteId: `site-${siteNumber}`,
      farmDisplayName: 'Demo Isolation Farm',
    });
    farmerId = farmer.farmer_id;
    const device = (await virtualNdaniService.list(farmer.farmer_id))[0];
    farmId = device.farm_id;

    const otherFarmer = await authService.enroll({
      pilotCode: `DB-${suffix}`,
      displayName: 'Other Demo Farmer',
      preferredLanguage: 'sn-en',
      pin: '2048',
      siteId: `site-${siteNumber + 1}`,
      farmDisplayName: 'Other Demo Farm',
    });
    otherFarmerId = otherFarmer.farmer_id;
    const otherDevice = (await virtualNdaniService.list(otherFarmer.farmer_id))[0];
    otherFarmId = otherDevice.farm_id;

    const before = await canonicalCounts(db);
    const metricsBefore = await operationsService.metrics();
    const evidenceBefore = await evidenceService.report();

    const demo = await demoService.create({
      farmerId: farmer.farmer_id,
      deviceId: device.virtual_device_id,
    });
    assert.equal(demo.demonstration_data, true);
    assert.equal(demo.non_evidentiary, true);
    assert.ok(demo.disclaimer.startsWith('DEMONSTRATION DATA'));
    assert.equal(
      demo.events.filter((event) => event.stage === 'sensor_collection').length,
      3
    );
    assert.ok(demo.events.every((event) => event.execution_kind === 'simulated'));
    assert.ok(demo.events.some(
      (event) => event.stage === 'privacy_proof'
        && event.status === 'not_executed'
    ));

    const after = await canonicalCounts(db);
    assert.deepEqual(after, before);
    const metricsAfter = await operationsService.metrics();
    assert.deepEqual(metricsAfter, metricsBefore);
    const evidenceAfter = await evidenceService.report();
    assert.deepEqual(
      withoutGeneratedAt(evidenceAfter),
      withoutGeneratedAt(evidenceBefore)
    );

    await assert.rejects(
      demoService.get({
        farmerId: otherFarmer.farmer_id,
        deviceId: device.virtual_device_id,
        sessionId: demo.demo_session_id,
      }),
      /demo_session_not_found/
    );

    const stored = await demoService.get({
      farmerId: farmer.farmer_id,
      deviceId: device.virtual_device_id,
      sessionId: demo.demo_session_id,
    });
    assert.equal(stored.events.length, demo.events.length);

    await db.query(
      `
        UPDATE virtual_ndani_demo_sessions
        SET expires_at = EXTRACT(EPOCH FROM NOW())::BIGINT - 1
        WHERE demo_session_id = $1
      `,
      [demo.demo_session_id]
    );
    assert.equal(await demoService.cleanupExpired(), 1);
    const expired = await db.query(
      'SELECT COUNT(*)::int AS count FROM virtual_ndani_demo_sessions WHERE demo_session_id = $1',
      [demo.demo_session_id]
    );
    assert.equal(Number(expired.rows[0].count), 0);

    const removable = await demoService.create({
      farmerId: farmer.farmer_id,
      deviceId: device.virtual_device_id,
    });
    await demoService.delete({
      farmerId: farmer.farmer_id,
      deviceId: device.virtual_device_id,
      sessionId: removable.demo_session_id,
    });
    const deleted = await db.query(
      'SELECT COUNT(*)::int AS count FROM virtual_ndani_demo_sessions WHERE demo_session_id = $1',
      [removable.demo_session_id]
    );
    assert.equal(Number(deleted.rows[0].count), 0);
    assert.deepEqual(await canonicalCounts(db), before);

    console.log('Physical Ndani Kit demonstration isolation tests passed');
  } finally {
    if (farmId) await db.query('DELETE FROM farms WHERE farm_id = $1', [farmId]);
    if (otherFarmId) await db.query('DELETE FROM farms WHERE farm_id = $1', [otherFarmId]);
    if (farmerId) await db.query('DELETE FROM farmers WHERE farmer_id = $1', [farmerId]);
    if (otherFarmerId) {
      await db.query('DELETE FROM farmers WHERE farmer_id = $1', [otherFarmerId]);
    }
    await db.end();
  }
}

async function canonicalCounts(db: any) {
  const result = await db.query(
    `
      SELECT
        (SELECT COUNT(*) FROM virtual_ndani_cycles)::int AS cycles,
        (SELECT COUNT(*) FROM virtual_ndani_readings)::int AS readings,
        (SELECT COUNT(*) FROM virtual_ndani_reading_fields)::int AS fields,
        (SELECT COUNT(*) FROM virtual_ndani_batches)::int AS batches,
        (SELECT COUNT(*) FROM virtual_ndani_batch_readings)::int AS batch_readings,
        (SELECT COUNT(*) FROM virtual_ndani_feature_decisions)::int AS feature_decisions,
        (SELECT COUNT(*) FROM virtual_ndani_pipeline_events)::int AS pipeline_events,
        (SELECT COUNT(*) FROM rewards)::int AS rewards
    `
  );
  return Object.fromEntries(
    Object.entries(result.rows[0]).map(([key, value]) => [key, Number(value)])
  );
}

function withoutGeneratedAt(report: any) {
  const clone = JSON.parse(JSON.stringify(report));
  delete clone.generated_at;
  return clone;
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
