import assert from 'assert';
import crypto from 'crypto';
import { authService } from './auth/authService';
import { initializeDatabase, getDatabase } from './database';
import { coordinatorService } from './virtual-ndani/coordinatorService';
import { coordinatorAdministrationService } from './virtual-ndani/coordinatorAdministrationService';
import { virtualNdaniService } from './virtual-ndani/service';
import { requireCoordinator } from './auth/authMiddleware';
import { FARMER_SESSION_COOKIE } from './auth/session';

async function run(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required for the coordinator integration test');
  }
  await initializeDatabase();
  const db = getDatabase();
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`;
  const siteId = `site-${suffix.slice(-3).padStart(3, '0')}`;
  let farmerId: string | undefined;
  let coordinatorId: string | undefined;
  let farmId: string | undefined;
  let administeredFarmerId: string | undefined;
  let administeredFarmId: string | undefined;

  try {
    const farmer = await authService.enroll({
      pilotCode: `FARM-${suffix}`,
      displayName: 'Coordinator Test Farmer',
      preferredLanguage: 'sn-en',
      pin: '2048',
      siteId,
      farmDisplayName: 'Coordinator Test Farm',
    });
    farmerId = farmer.farmer_id;
    const coordinator = await authService.enrollCoordinator({
      pilotCode: `COORD-${suffix}`,
      displayName: 'Pilot Coordinator',
      preferredLanguage: 'en',
      pin: '4096',
    });
    coordinatorId = coordinator.farmer_id;
    assert.equal(coordinator.system_role, 'coordinator');

    const farmerLogin = await authService.login(`FARM-${suffix}`, '2048');
    assert.equal(farmerLogin.farmer.system_role, 'farmer');
    const coordinatorLogin = await authService.login(`COORD-${suffix}`, '4096');
    assert.equal(coordinatorLogin.farmer.system_role, 'coordinator');
    assert.equal(
      await coordinatorMiddlewareStatus(farmerLogin.sessionToken),
      403
    );
    assert.equal(
      await coordinatorMiddlewareStatus(coordinatorLogin.sessionToken),
      200
    );

    const administered = await coordinatorAdministrationService.enrollFarmer({
      pilotCode: `ADMIN-${suffix}`,
      displayName: 'Administered Farmer',
      preferredLanguage: 'sn-en',
      pin: '1357',
      siteId: `site-${String((Number(siteId.slice(-3)) + 1) % 1000).padStart(3, '0')}`,
      farmDisplayName: 'Administered Farm',
      coordinatorId: coordinator.farmer_id,
    });
    administeredFarmerId = administered.farmer_id;
    administeredFarmId = administered.farm_id;
    assert.ok(administered.device_code?.startsWith('NDANI-ODZI-'));
    assert.equal(administered.gemini_request_count, 0);
    assert.equal((await authService.login(`ADMIN-${suffix}`, '1357')).farmer.farmer_id, administered.farmer_id);

    const updatedFarmer = await coordinatorAdministrationService.updateFarmer({
      farmerId: administered.farmer_id,
      displayName: 'Updated Administered Farmer',
      preferredLanguage: 'sn',
      status: 'active',
      farmDisplayName: 'Updated Administered Farm',
      coordinatorId: coordinator.farmer_id,
    });
    assert.equal(updatedFarmer.display_name, 'Updated Administered Farmer');
    assert.equal(updatedFarmer.preferred_language, 'sn');
    assert.equal(updatedFarmer.farm_display_name, 'Updated Administered Farm');

    await coordinatorAdministrationService.resetPin({
      farmerId: administered.farmer_id,
      pin: '2468',
      coordinatorId: coordinator.farmer_id,
    });
    await assert.rejects(
      authService.login(`ADMIN-${suffix}`, '1357'),
      /invalid_credentials/
    );
    assert.equal(
      (await authService.login(`ADMIN-${suffix}`, '2468')).farmer.farmer_id,
      administered.farmer_id
    );

    const suspendedFarmer = await coordinatorAdministrationService.updateFarmer({
      farmerId: administered.farmer_id,
      displayName: 'Updated Administered Farmer',
      preferredLanguage: 'sn',
      status: 'suspended',
      farmDisplayName: 'Updated Administered Farm',
      coordinatorId: coordinator.farmer_id,
    });
    assert.equal(suspendedFarmer.status, 'suspended');
    await assert.rejects(
      authService.login(`ADMIN-${suffix}`, '2468'),
      /invalid_credentials/
    );

    const devices = await virtualNdaniService.list(farmer.farmer_id);
    const device = devices[0];
    farmId = device.farm_id;

    const approvalReading = await createFlaggedReading(
      farmer.farmer_id,
      device.virtual_device_id,
      'poor',
      'severe'
    );
    const pending = await coordinatorService.pendingReviews();
    assert.ok(pending.some((reading) => reading.reading_id === approvalReading.reading_id));

    const approved = await coordinatorService.review({
      readingId: approvalReading.reading_id,
      coordinatorId: coordinator.farmer_id,
      decision: 'approved',
      reason: 'Visited the field and confirmed this reading is suitable for research.',
      coordinatorDurationSeconds: 90,
    });
    assert.equal(approved.resulting_quality_status, 'accepted');
    const approvedAgain = await coordinatorService.review({
      readingId: approvalReading.reading_id,
      coordinatorId: coordinator.farmer_id,
      decision: 'approved',
      reason: 'Visited the field and confirmed this reading is suitable for research.',
    });
    assert.equal(approvedAgain.decision, 'approved');

    const approvedBatches = await db.query(
      `
        SELECT COUNT(*)::int AS count
        FROM virtual_ndani_batch_readings
        WHERE reading_id = $1
      `,
      [approvalReading.reading_id]
    );
    assert.equal(Number(approvedBatches.rows[0].count), 1);
    const coordinatorDuration = await db.query(
      `
        SELECT cycle.coordinator_duration_seconds
        FROM virtual_ndani_cycles cycle
        JOIN virtual_ndani_readings reading ON reading.cycle_id = cycle.cycle_id
        WHERE reading.reading_id = $1
      `,
      [approvalReading.reading_id]
    );
    assert.equal(Number(coordinatorDuration.rows[0].coordinator_duration_seconds), 90);

    const exclusionReading = await createFlaggedReading(
      farmer.farmer_id,
      device.virtual_device_id,
      'fair',
      'severe'
    );
    const excluded = await coordinatorService.review({
      readingId: exclusionReading.reading_id,
      coordinatorId: coordinator.farmer_id,
      decision: 'excluded',
      reason: 'The reported condition could not be verified during the follow-up visit.',
    });
    assert.equal(excluded.resulting_quality_status, 'excluded');
    const excludedBatches = await db.query(
      `
        SELECT COUNT(*)::int AS count
        FROM virtual_ndani_batch_readings
        WHERE reading_id = $1
      `,
      [exclusionReading.reading_id]
    );
    assert.equal(Number(excludedBatches.rows[0].count), 0);

    await assert.rejects(
      coordinatorService.review({
        readingId: exclusionReading.reading_id,
        coordinatorId: coordinator.farmer_id,
        decision: 'approved',
        reason: 'Attempt to reverse a completed decision.',
      }),
      /reading_already_reviewed/
    );

    const fleet = await coordinatorService.fleet();
    const fleetDevice = fleet.find(
      (candidate) => candidate.virtual_device_id === device.virtual_device_id
    );
    assert.ok(fleetDevice);
    assert.equal(fleetDevice?.contribution_count, 1);

    const reviews = await db.query(
      `
        SELECT decision, reason, coordinator_id
        FROM virtual_ndani_reading_reviews
        WHERE reading_id IN ($1, $2)
        ORDER BY decision
      `,
      [approvalReading.reading_id, exclusionReading.reading_id]
    );
    assert.equal(reviews.rows.length, 2);
    assert.ok(reviews.rows.every((review) => review.coordinator_id === coordinator.farmer_id));

    const scheduledCycleId = crypto.randomUUID();
    const futureDue = Math.floor(Date.now() / 1000) + 86400;
    await db.query(
      `
        INSERT INTO virtual_ndani_cycles (
          cycle_id, virtual_device_id, scheduled_for, due_at, status, created_by
        )
        VALUES ($1, $2, $3, $3, 'scheduled', 'coordinator-test')
      `,
      [scheduledCycleId, device.virtual_device_id, futureDue]
    );
    const missed = await coordinatorService.markMissed({
      deviceId: device.virtual_device_id,
      cycleId: scheduledCycleId,
      reason: 'farmer_unavailable',
      coordinatorId: coordinator.farmer_id,
    });
    assert.equal(missed.status, 'missed');
    assert.equal(missed.missed_reason, 'farmer_unavailable');

    console.log('Coordinator fleet and review integration tests passed');
  } finally {
    if (farmerId) await db.query('DELETE FROM farmers WHERE farmer_id = $1', [farmerId]);
    if (farmId) await db.query('DELETE FROM farms WHERE farm_id = $1', [farmId]);
    if (administeredFarmerId) {
      await db.query('DELETE FROM farmers WHERE farmer_id = $1', [administeredFarmerId]);
    }
    if (administeredFarmId) {
      await db.query('DELETE FROM farms WHERE farm_id = $1', [administeredFarmId]);
    }
    if (coordinatorId) {
      await db.query('DELETE FROM farmers WHERE farmer_id = $1', [coordinatorId]);
    }
    await db.end();
  }
}

async function coordinatorMiddlewareStatus(token: string): Promise<number> {
  let statusCode = 200;
  let nextCalled = false;
  const request: any = {
    headers: {
      cookie: `${FARMER_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    },
  };
  const response: any = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json() {
      return this;
    },
  };
  await requireCoordinator(request, response, () => {
    nextCalled = true;
  });
  return nextCalled ? 200 : statusCode;
}

async function createFlaggedReading(
  farmerId: string,
  deviceId: string,
  plantCondition: 'fair' | 'poor',
  pestSigns: 'some' | 'severe'
) {
  const cycle = await virtualNdaniService.startCycle(
    farmerId,
    deviceId,
    'manual_guided'
  );
  await virtualNdaniService.saveGuidedReading(
    farmerId,
    deviceId,
    cycle.cycle_id,
    {
      soil_moisture: 'wet',
      rain_condition: 'moderate',
      plant_condition: plantCondition,
      pest_disease_signs: pestSigns,
      irrigation: 'no',
    }
  );
  const reading = await virtualNdaniService.confirmReading(
    farmerId,
    deviceId,
    cycle.cycle_id
  );
  assert.equal(reading.quality_status, 'flagged');
  return reading;
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
