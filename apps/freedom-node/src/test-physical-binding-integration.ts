import assert from 'assert';
import crypto from 'crypto';
import { authService } from './auth/authService';
import { getDatabase, initializeDatabase } from './database';
import { physicalBindingService } from './virtual-ndani/physicalBindingService';
import { physicalReadingService } from './virtual-ndani/physicalReadingService';
import { virtualNdaniService } from './virtual-ndani/service';

async function run(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required for the physical binding integration test');
  }
  await initializeDatabase();
  const db = getDatabase();
  const suffix = `${Date.now()}`.slice(-8) + Math.floor(Math.random() * 100);
  const siteNumber = 100 + Math.floor(Math.random() * 800);
  const farmerIds: string[] = [];
  const farmIds: string[] = [];
  const registryKeys: string[] = [];

  try {
    const coordinator = await authService.enrollCoordinator({
      pilotCode: `BC-${suffix}`,
      displayName: 'Physical Binding Coordinator',
      preferredLanguage: 'en',
      pin: '4096',
    });
    farmerIds.push(coordinator.farmer_id);

    const firstFarmer = await authService.enroll({
      pilotCode: `BA-${suffix}`,
      displayName: 'Binding Farmer A',
      preferredLanguage: 'sn-en',
      pin: '2048',
      siteId: `site-${siteNumber}`,
      farmDisplayName: 'Binding Farm A',
    });
    farmerIds.push(firstFarmer.farmer_id);
    const firstDevice = (await virtualNdaniService.list(firstFarmer.farmer_id))[0];
    farmIds.push(firstDevice.farm_id);

    const cycle = await virtualNdaniService.startCycle(
      firstFarmer.farmer_id,
      firstDevice.virtual_device_id,
      'manual_guided'
    );
    await virtualNdaniService.saveGuidedReading(
      firstFarmer.farmer_id,
      firstDevice.virtual_device_id,
      cycle.cycle_id,
      {
        soil_moisture: 'moist',
        rain_condition: 'none',
        plant_condition: 'good',
        pest_disease_signs: 'none',
        irrigation: 'yes',
      }
    );
    const manualReading = await virtualNdaniService.confirmReading(
      firstFarmer.farmer_id,
      firstDevice.virtual_device_id,
      cycle.cycle_id
    );
    const historicalFieldsBefore = await db.query(
      `
        SELECT channel_key, measurement_kind, source_class, value_json
        FROM virtual_ndani_reading_fields
        WHERE reading_id = $1
        ORDER BY channel_key
      `,
      [manualReading.reading_id]
    );

    const keys = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
    });
    const jwk = keys.publicKey.export({ format: 'jwk' });
    const devicePubkey = `${fromBase64Url(jwk.x!)}${fromBase64Url(jwk.y!)}`;
    registryKeys.push(devicePubkey);
    await db.query(
      `
        INSERT INTO devices (
          device_pubkey, owner_wallet, registration_epoch, expiry_epoch,
          device_id, metadata, merkle_leaf_hash
        )
        VALUES ($1, $2, $3, $4, $5, '{}', $6)
      `,
      [
        devicePubkey,
        `test-wallet-${suffix}`,
        Math.floor(Date.now() / 1000),
        Math.floor(Date.now() / 1000) + 86400,
        `physical-${suffix}`,
        crypto.createHash('sha256').update(devicePubkey).digest('hex'),
      ]
    );

    const challenge = await physicalBindingService.issueChallenge({
      deviceId: firstDevice.virtual_device_id,
      devicePubkey: `04${devicePubkey}`,
      coordinatorId: coordinator.farmer_id,
    });
    assert.equal(challenge.signature_algorithm, 'ECDSA_P256_SHA256_IEEE_P1363');
    const signature = crypto.sign(
      'sha256',
      Buffer.from(challenge.challenge, 'hex'),
      { key: keys.privateKey, dsaEncoding: 'ieee-p1363' }
    ).toString('hex');
    const binding = await physicalBindingService.verify({
      deviceId: firstDevice.virtual_device_id,
      challengeId: challenge.challenge_id,
      signature,
      coordinatorId: coordinator.farmer_id,
    });
    assert.equal(binding.mode, 'physical_bound');
    assert.equal(binding.physical_device_pubkey, devicePubkey);
    assert.equal(binding.historical_manual_readings_preserved, true);

    const packet = Buffer.alloc(144);
    crypto.randomBytes(32).copy(packet, 0);
    packet.writeFloatLE(24.5, 32);
    packet.writeFloatLE(62.25, 36);
    packet.writeFloatLE(48.75, 40);
    packet.writeUInt32LE(123456, 44);
    crypto.randomBytes(32).copy(packet, 48);
    const packetSignature = crypto.sign(
      'sha256',
      packet.subarray(0, 80),
      { key: keys.privateKey, dsaEncoding: 'ieee-p1363' }
    );
    packetSignature.copy(packet, 80);
    const physicalReading = await physicalReadingService.ingest({
      devicePubkey,
      packetHex: packet.toString('hex'),
      transport: 'test_fixture',
    });
    assert.equal(physicalReading.duplicate, false);
    assert.equal(physicalReading.signature_verified, true);
    assert.deepEqual(
      physicalReading.measured_channels,
      ['temperature', 'humidity', 'soil_moisture']
    );
    assert.deepEqual(physicalReading.unavailable_channels, ['pressure']);
    const duplicateReading = await physicalReadingService.ingest({
      devicePubkey,
      packetHex: packet.toString('hex'),
      transport: 'test_fixture',
    });
    assert.equal(duplicateReading.duplicate, true);
    assert.equal(duplicateReading.reading_id, physicalReading.reading_id);

    const tamperedPacket = Buffer.from(packet);
    tamperedPacket.writeFloatLE(33, 32);
    await assert.rejects(
      physicalReadingService.ingest({
        devicePubkey,
        packetHex: tamperedPacket.toString('hex'),
        transport: 'test_fixture',
      }),
      /invalid_physical_reading_signature/
    );

    const physicalFields = await db.query(
      `
        SELECT channel_key, value_json, unit, measurement_kind,
          source_class, review_status
        FROM virtual_ndani_reading_fields
        WHERE reading_id = $1
        ORDER BY channel_key
      `,
      [physicalReading.reading_id]
    );
    const temperature = physicalFields.rows.find(
      (field) => field.channel_key === 'temperature'
    );
    const pressure = physicalFields.rows.find(
      (field) => field.channel_key === 'pressure'
    );
    assert.equal(temperature.measurement_kind, 'measured');
    assert.equal(temperature.source_class, 'physical_sensor');
    assert.equal(JSON.parse(temperature.value_json), 24.5);
    assert.equal(pressure.measurement_kind, 'unavailable');
    assert.equal(pressure.source_class, null);
    assert.equal(pressure.value_json, null);

    const physicalContribution = await db.query(
      `
        SELECT decision.channel_key, decision.decision, decision.reason
        FROM virtual_ndani_feature_decisions decision
        WHERE decision.reading_id = $1
        ORDER BY decision.channel_key
      `,
      [physicalReading.reading_id]
    );
    assert.equal(
      physicalContribution.rows.filter((row) => row.decision === 'eligible').length,
      3
    );
    assert.ok(physicalContribution.rows.some(
      (row) => row.channel_key === 'pressure'
        && row.decision === 'excluded'
        && row.reason === 'hardware_channel_unavailable'
    ));
    const attestationEvents = await db.query(
      `
        SELECT stage, execution_kind, status, detail_json
        FROM virtual_ndani_pipeline_events
        WHERE reading_id = $1
          AND stage IN ('physical_device_attestation', 'manual_reading_proof')
      `,
      [physicalReading.reading_id]
    );
    assert.equal(attestationEvents.rows.length, 1);
    assert.equal(attestationEvents.rows[0].stage, 'physical_device_attestation');
    assert.equal(attestationEvents.rows[0].execution_kind, 'real');
    assert.equal(attestationEvents.rows[0].status, 'signature_verified');
    assert.equal(JSON.parse(attestationEvents.rows[0].detail_json).zk_proof_verified, false);

    const comparison = await physicalReadingService.comparison(
      firstDevice.virtual_device_id
    );
    assert.equal(comparison.coverage.physical_readings, 1);
    assert.equal(comparison.coverage.human_readings, 1);
    assert.ok(comparison.latest_physical);
    assert.ok(comparison.latest_human);
    if (!comparison.latest_physical || !comparison.latest_human) {
      throw new Error('comparison_readings_missing');
    }
    assert.equal(comparison.latest_physical.temperature, 24.5);
    assert.equal(comparison.latest_physical.soil_moisture, 48.75);
    assert.equal(comparison.latest_human.soil_moisture, 'moist');
    assert.ok(comparison.interpretation.includes('not treated as equivalent'));

    const boundDevice = await virtualNdaniService.get(
      firstFarmer.farmer_id,
      firstDevice.virtual_device_id
    );
    assert.equal(boundDevice.mode, 'physical_bound');
    assert.equal(boundDevice.physical_device_pubkey, devicePubkey);
    assert.equal(
      boundDevice.channels.find((channel: any) => channel.channel_key === 'temperature')
        ?.current.source_class,
      'physical_sensor'
    );
    assert.equal(
      boundDevice.channels.find((channel: any) => channel.channel_key === 'plant_condition')
        ?.current.source_class,
      'manual_proxy'
    );
    for (const channel of boundDevice.channels) {
      assert.equal(
        channel.physical_collection_enabled,
        ['temperature', 'humidity', 'pressure', 'soil_moisture']
          .includes(channel.channel_key)
      );
    }

    const historicalFieldsAfter = await db.query(
      `
        SELECT channel_key, measurement_kind, source_class, value_json
        FROM virtual_ndani_reading_fields
        WHERE reading_id = $1
        ORDER BY channel_key
      `,
      [manualReading.reading_id]
    );
    assert.deepEqual(historicalFieldsAfter.rows, historicalFieldsBefore.rows);
    assert.ok(historicalFieldsAfter.rows.some(
      (field) => field.source_class === 'manual_proxy'
    ));
    assert.ok(historicalFieldsAfter.rows.some(
      (field) => field.measurement_kind === 'unavailable'
    ));

    await assert.rejects(
      physicalBindingService.verify({
        deviceId: firstDevice.virtual_device_id,
        challengeId: challenge.challenge_id,
        signature,
        coordinatorId: coordinator.farmer_id,
      }),
      /binding_challenge_already_consumed/
    );
    await assert.rejects(
      physicalBindingService.issueChallenge({
        deviceId: firstDevice.virtual_device_id,
        devicePubkey,
        coordinatorId: coordinator.farmer_id,
      }),
      /virtual_ndani_already_bound/
    );

    const secondFarmer = await authService.enroll({
      pilotCode: `BB-${suffix}`,
      displayName: 'Binding Farmer B',
      preferredLanguage: 'sn-en',
      pin: '2048',
      siteId: `site-${siteNumber + 1}`,
      farmDisplayName: 'Binding Farm B',
    });
    farmerIds.push(secondFarmer.farmer_id);
    const secondDevice = (await virtualNdaniService.list(secondFarmer.farmer_id))[0];
    farmIds.push(secondDevice.farm_id);
    await assert.rejects(
      physicalBindingService.issueChallenge({
        deviceId: secondDevice.virtual_device_id,
        devicePubkey,
        coordinatorId: coordinator.farmer_id,
      }),
      /physical_device_already_bound/
    );

    const event = await db.query(
      `
        SELECT execution_kind, status, detail_json
        FROM virtual_ndani_pipeline_events
        WHERE virtual_device_id = $1 AND stage = 'physical_device_bound'
      `,
      [firstDevice.virtual_device_id]
    );
    assert.equal(event.rows.length, 1);
    assert.equal(event.rows[0].execution_kind, 'real');
    assert.equal(event.rows[0].status, 'verified');
    assert.equal(
      JSON.parse(event.rows[0].detail_json).historical_manual_readings_preserved,
      true
    );

    console.log('Virtual Ndani Kit physical P-256 binding integration tests passed');
  } finally {
    for (const farmId of farmIds) {
      await db.query('DELETE FROM farms WHERE farm_id = $1', [farmId]);
    }
    for (const farmerId of farmerIds) {
      await db.query('DELETE FROM farmers WHERE farmer_id = $1', [farmerId]);
    }
    for (const key of registryKeys) {
      await db.query('DELETE FROM devices WHERE device_pubkey = $1', [key]);
    }
    await db.end();
  }
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, 'base64url').toString('hex').padStart(64, '0');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
