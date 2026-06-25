import assert from 'assert';
import crypto from 'crypto';
import { authService } from './auth/authService';
import { initializeDatabase, getDatabase } from './database';
import { operationsService } from './virtual-ndani/operationsService';
import { evidenceService } from './virtual-ndani/evidenceService';
import { virtualNdaniService } from './virtual-ndani/service';

async function run(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required for the operations integration test');
  }
  await initializeDatabase();
  const db = getDatabase();
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`;
  const siteId = `site-${suffix.slice(-3).padStart(3, '0')}`;
  let farmerId: string | undefined;
  let farmId: string | undefined;

  try {
    const farmer = await authService.enroll({
      pilotCode: `OPS-${suffix}`,
      displayName: 'Operations Test Farmer',
      preferredLanguage: 'sn-en',
      pin: '2048',
      siteId,
      farmDisplayName: 'Operations Test Farm',
    });
    farmerId = farmer.farmer_id;

    const devices = await virtualNdaniService.list(farmer.farmer_id);
    const device = devices[0];
    farmId = device.farm_id;
    assert.ok(device.current_cycle_id);
    assert.equal(device.current_cycle_status, 'scheduled');
    assert.equal(device.operations.total_cycles, 1);

    await operationsService.ensureSchedules();
    const scheduledToday = await db.query(
      `
        SELECT COUNT(*)::int AS count
        FROM virtual_ndani_cycles
        WHERE virtual_device_id = $1
      `,
      [device.virtual_device_id]
    );
    assert.equal(Number(scheduledToday.rows[0].count), 1);

    const started = await virtualNdaniService.startCycle(
      farmer.farmer_id,
      device.virtual_device_id,
      'manual_guided'
    );
    assert.equal(started.status, 'started');
    assert.equal(started.collection_mode, 'manual_guided');
    await virtualNdaniService.saveGuidedReading(
      farmer.farmer_id,
      device.virtual_device_id,
      started.cycle_id,
      {
        soil_moisture: 'moist',
        rain_condition: 'none',
        plant_condition: 'good',
        pest_disease_signs: 'none',
        irrigation: 'yes',
      }
    );
    await virtualNdaniService.confirmReading(
      farmer.farmer_id,
      device.virtual_device_id,
      started.cycle_id
    );
    const duration = await db.query(
      `
        SELECT manual_duration_seconds
        FROM virtual_ndani_cycles
        WHERE cycle_id = $1
      `,
      [started.cycle_id]
    );
    assert.ok(Number(duration.rows[0].manual_duration_seconds) >= 0);

    const oldDue = Math.floor(Date.now() / 1000) - 2 * 86400;
    const missedCycleId = crypto.randomUUID();
    await db.query(
      `
        INSERT INTO virtual_ndani_cycles (
          cycle_id, virtual_device_id, scheduled_for, due_at, status, created_by
        )
        VALUES ($1, $2, $3, $3, 'scheduled', 'operations-test')
      `,
      [missedCycleId, device.virtual_device_id, oldDue]
    );
    const missedCount = await operationsService.markOverdueMissed(
      Math.floor(Date.now() / 1000)
    );
    assert.ok(missedCount >= 1);
    const missed = await db.query(
      `
        SELECT status, missed_reason
        FROM virtual_ndani_cycles
        WHERE cycle_id = $1
      `,
      [missedCycleId]
    );
    assert.equal(missed.rows[0].status, 'missed');
    assert.equal(missed.rows[0].missed_reason, 'reason_not_recorded');
    const fakeReading = await db.query(
      'SELECT COUNT(*)::int AS count FROM virtual_ndani_readings WHERE cycle_id = $1',
      [missedCycleId]
    );
    assert.equal(Number(fakeReading.rows[0].count), 0);

    const metrics = await operationsService.metrics();
    const expectedProjection = await db.query(
      `
        SELECT COALESCE(SUM(
          FLOOR((24 * 60)::numeric / future_physical_interval_minutes)
        ), 0)::int AS expected
        FROM virtual_ndani_devices
      `
    );
    assert.equal(
      metrics.projected_physical_readings_per_day,
      Number(expectedProjection.rows[0].expected)
    );
    assert.ok(metrics.missed_cycles >= 1);
    assert.ok(metrics.unavailable_hardware_channel_instances >= 3);

    const deviceOperations = await operationsService.deviceStatus(
      device.virtual_device_id
    );
    assert.equal(deviceOperations.completed_cycles, 1);
    assert.ok(deviceOperations.missed_cycles >= 1);

    const evidence = await evidenceService.report();
    const evidenceDevice = evidence.fleet.find(
      (candidate) => candidate.device_code === device.device_code
    );
    assert.ok(evidenceDevice);
    assert.equal(evidence.methodology.synthetic_demo_records_included, false);
    assert.ok(evidence.channels.some(
      (channel) => channel.channel_key === 'temperature'
        && channel.unavailable_count >= 1
    ));
    assert.ok(evidence.research.model_ready_batches >= 1);
    assert.equal(evidence.research.features_used_in_training, 0);
    assert.equal(evidence.research.model_training_completed, false);
    assert.ok(evidence.research.manual_readings_without_device_proof >= 1);
    assert.ok(!JSON.stringify(evidence).includes('Operations Test Farmer'));

    const csv = await evidenceService.csv();
    assert.ok(csv.startsWith('device_code,site_id,mode'));
    assert.ok(csv.includes(device.device_code));
    assert.ok(!csv.includes('Operations Test Farmer'));

    console.log('Virtual Ndani Kit scheduling and hardware-value metric tests passed');
  } finally {
    if (farmerId) await db.query('DELETE FROM farmers WHERE farmer_id = $1', [farmerId]);
    if (farmId) await db.query('DELETE FROM farms WHERE farm_id = $1', [farmId]);
    await db.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
