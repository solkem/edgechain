import assert from 'assert';
import { authService } from './auth/authService';
import { initializeDatabase, getDatabase } from './database';
import { virtualNdaniService } from './virtual-ndani/service';

async function run(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required for the Virtual Ndani Kit integration test');
  }

  await initializeDatabase();
  const db = getDatabase();
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`;
  const pilotCode = `NDANI-${suffix}`;
  const siteId = `site-${suffix.slice(-3).padStart(3, '0')}`;
  let farmerId: string | undefined;
  let farmId: string | undefined;

  try {
    const farmer = await authService.enroll({
      pilotCode,
      displayName: 'Virtual Ndani Kit Test Farmer',
      preferredLanguage: 'sn-en',
      pin: '2048',
      siteId,
      farmDisplayName: 'Virtual Ndani Kit Test Farm',
    });
    farmerId = farmer.farmer_id;

    const devices = await virtualNdaniService.list(farmer.farmer_id);
    assert.equal(devices.length, 1);
    const device = devices[0];
    farmId = device.farm_id;
    assert.equal(device.device_code, `NDANI-ODZI-${siteId.slice(-3)}`);
    assert.equal(device.channels.length, 8);
    assert.equal(device.automation.future_readings_per_day, 48);

    const temperature = device.channels.find(
      (channel: any) => channel.channel_key === 'temperature'
    );
    assert.equal(temperature.current.measurement_kind, 'unavailable');
    assert.equal(temperature.current.value, null);
    assert.equal(temperature.current.source_class, null);

    const cycle = await virtualNdaniService.startCycle(
      farmer.farmer_id,
      device.virtual_device_id,
      'manual_guided'
    );
    assert.equal(cycle.status, 'started');
    assert.equal(cycle.collection_mode, 'manual_guided');

    const repeated = await virtualNdaniService.startCycle(
      farmer.farmer_id,
      device.virtual_device_id,
      'manual_guided'
    );
    assert.equal(repeated.cycle_id, cycle.cycle_id);

    const draft = await virtualNdaniService.saveGuidedReading(
      farmer.farmer_id,
      device.virtual_device_id,
      cycle.cycle_id,
      {
        soil_moisture: 'moist',
        rain_condition: 'light',
        plant_condition: 'good',
        pest_disease_signs: 'none',
        irrigation: 'no',
        notes: 'Structured integration test observation',
      }
    );
    assert.equal(draft.quality_status, 'awaiting_confirmation');
    assert.equal(draft.fields.length, 8);
    const draftTemperature = draft.fields.find(
      (field: any) => field.channel_key === 'temperature'
    );
    assert.equal(draftTemperature.measurement_kind, 'unavailable');
    assert.equal(draftTemperature.value, null);
    assert.equal(draftTemperature.source_class, null);
    const draftSoil = draft.fields.find(
      (field: any) => field.channel_key === 'soil_moisture'
    );
    assert.equal(draftSoil.value, 'moist');
    assert.equal(draftSoil.measurement_kind, 'observed');
    assert.equal(draftSoil.source_class, 'manual_proxy');

    const confirmed = await virtualNdaniService.confirmReading(
      farmer.farmer_id,
      device.virtual_device_id,
      cycle.cycle_id
    );
    assert.equal(confirmed.quality_status, 'accepted');

    const updatedDevices = await virtualNdaniService.list(farmer.farmer_id);
    const updatedSoil = updatedDevices[0].channels.find(
      (channel: any) => channel.channel_key === 'soil_moisture'
    );
    assert.equal(updatedSoil.current.value, 'moist');
    assert.equal(updatedSoil.current.source_class, 'manual_proxy');
    const updatedTemperature = updatedDevices[0].channels.find(
      (channel: any) => channel.channel_key === 'temperature'
    );
    assert.equal(updatedTemperature.current.value, null);
    assert.equal(updatedTemperature.current.measurement_kind, 'unavailable');

    const timeline = await virtualNdaniService.timeline(
      farmer.farmer_id,
      device.virtual_device_id,
      20
    );
    assert.ok(timeline.length >= 4);
    assert.ok(timeline.some((event: any) => event.stage === 'observation_confirmed'));
    assert.ok(timeline.some(
      (event: any) =>
        event.stage === 'model_readiness_updated'
        && event.execution_kind === 'real'
        && event.status === 'model_ready'
    ));
    assert.ok(timeline.some(
      (event: any) =>
        event.stage === 'manual_reading_proof'
        && event.execution_kind === 'not_applicable'
    ));
    assert.ok(timeline.some(
      (event: any) =>
        event.stage === 'training_run'
        && event.execution_kind === 'pending'
    ));

    const fieldRows = await db.query(
      `
        SELECT channel_key, value_json, measurement_kind, source_class
        FROM virtual_ndani_reading_fields
        WHERE reading_id = $1
        ORDER BY channel_key
      `,
      [confirmed.reading_id]
    );
    assert.equal(fieldRows.rows.length, 8);
    assert.equal(
      fieldRows.rows.filter((row: any) => row.measurement_kind === 'unavailable').length,
      3
    );
    assert.equal(
      fieldRows.rows.filter((row: any) => row.source_class === 'manual_proxy').length,
      5
    );

    const contributions = await virtualNdaniService.contributions(
      farmer.farmer_id,
      device.virtual_device_id,
      10
    );
    assert.equal(contributions.length, 1);
    assert.equal(contributions[0].status, 'model_ready');
    assert.equal(contributions[0].execution_kind, 'real');
    assert.equal(contributions[0].eligible_feature_count, 5);
    assert.equal(contributions[0].excluded_feature_count, 3);
    assert.equal(
      contributions[0].features.filter((feature: any) => feature.decision === 'eligible').length,
      5
    );
    assert.equal(
      contributions[0].features.filter((feature: any) => feature.reason === 'hardware_channel_unavailable').length,
      3
    );
    assert.equal(contributions[0].quality_summary.model_training_completed, false);
    assert.equal(contributions[0].quality_summary.proof_verified, false);
    assert.equal(contributions[0].quality_summary.reward_paid, false);

    const flaggedCycle = await virtualNdaniService.startCycle(
      farmer.farmer_id,
      device.virtual_device_id,
      'manual_guided'
    );
    await virtualNdaniService.saveGuidedReading(
      farmer.farmer_id,
      device.virtual_device_id,
      flaggedCycle.cycle_id,
      {
        soil_moisture: 'wet',
        rain_condition: 'moderate',
        plant_condition: 'poor',
        pest_disease_signs: 'severe',
        irrigation: 'no',
      }
    );
    const flagged = await virtualNdaniService.confirmReading(
      farmer.farmer_id,
      device.virtual_device_id,
      flaggedCycle.cycle_id
    );
    assert.equal(flagged.quality_status, 'flagged');
    const contributionsAfterFlag = await virtualNdaniService.contributions(
      farmer.farmer_id,
      device.virtual_device_id,
      10
    );
    assert.equal(contributionsAfterFlag.length, 1);
    const flaggedEvents = await db.query(
      `
        SELECT execution_kind, status
        FROM virtual_ndani_pipeline_events
        WHERE reading_id = $1 AND stage = 'model_readiness_updated'
      `,
      [flagged.reading_id]
    );
    assert.equal(flaggedEvents.rows.length, 1);
    assert.equal(flaggedEvents.rows[0].execution_kind, 'pending');
    assert.equal(flaggedEvents.rows[0].status, 'coordinator_review_required');

    await assert.rejects(
      virtualNdaniService.startCycle(
        farmer.farmer_id,
        device.virtual_device_id,
        'synthetic_demo'
      ),
      /invalid_pilot_collection_mode/
    );

    console.log('Virtual Ndani Kit database integration tests passed');
  } finally {
    if (farmerId) {
      await db.query('DELETE FROM farmers WHERE farmer_id = $1', [farmerId]);
    }
    if (farmId) {
      await db.query('DELETE FROM farms WHERE farm_id = $1', [farmId]);
    }
    await db.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
