import assert from 'assert';
import { initializeDatabase, getDatabase } from './database';
import { authRepository } from './auth/authRepository';
import { authService } from './auth/authService';
import { agentService } from './agent/application/agentService';

async function run(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required for the agent integration test');
  }

  await initializeDatabase();
  const db = getDatabase();
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`;
  const pilotCode = `TEST-${suffix}`;
  const siteId = `site-${suffix.slice(-3).padStart(3, '0')}`;
  let farmerId: string | undefined;
  let farmId: string | undefined;

  try {
    const farmer = await authService.enroll({
      pilotCode,
      displayName: 'Integration Farmer',
      preferredLanguage: 'sn-en',
      pin: '2048',
      siteId,
      farmDisplayName: 'Integration Farm',
    });
    farmerId = farmer.farmer_id;

    const login = await authService.login(pilotCode, '2048');
    assert.equal(login.farmer.farmer_id, farmer.farmer_id);

    const farms = await authRepository.listFarms(farmer.farmer_id);
    assert.equal(farms.length, 1);
    assert.equal(farms[0].site_id, siteId);
    farmId = farms[0].farm_id;

    const first = await agentService.receiveWebMessage({
      farmerId: farmer.farmer_id,
      farmId: farms[0].farm_id,
      text: 'I am reporting maize',
      externalMessageId: `message-${suffix}`,
    });
    assert.equal(first.conversation.state, 'awaiting_missing_field');
    assert.equal(first.conversation.observation_draft.crop_type, 'maize');
    assert.equal(first.conversation.pending_field, 'crop_stage');
    assert.equal(first.duplicate, false);

    const duplicate = await agentService.receiveWebMessage({
      farmerId: farmer.farmer_id,
      farmId: farms[0].farm_id,
      text: 'I am reporting maize',
      externalMessageId: `message-${suffix}`,
    });
    assert.equal(duplicate.duplicate, true);

    const messageCount = await db.query(
      `
        SELECT COUNT(*)::int AS count
        FROM agent_messages
        WHERE conversation_id = $1
      `,
      [first.conversation.conversation_id]
    );
    assert.equal(Number(messageCount.rows[0].count), 2);

    const extractionCount = await db.query(
      `
        SELECT COUNT(*)::int AS count
        FROM agent_extraction_events
        WHERE conversation_id = $1
      `,
      [first.conversation.conversation_id]
    );
    assert.equal(Number(extractionCount.rows[0].count), 1);

    const ruleCount = await db.query(
      `
        SELECT COUNT(*)::int AS count
        FROM agent_rule_decisions
        WHERE conversation_id = $1
      `,
      [first.conversation.conversation_id]
    );
    assert.equal(Number(ruleCount.rows[0].count), 1);

    const restored = await agentService.getLatestWebConversation({
      farmerId: farmer.farmer_id,
      farmId: farms[0].farm_id,
    });
    assert.equal(restored?.messages.length, 2);
    assert.equal(restored?.messages[0].direction, 'inbound');
    assert.equal(restored?.messages[1].direction, 'outbound');

    const followUps = [
      ['vegetative', 'rain_level'],
      ['light rain', 'soil_condition'],
      ['moist', 'plant_condition'],
      ['plants are looking good', 'pest_or_disease_signs'],
      ['no pests', 'irrigated_today'],
    ] as const;
    for (const [text, nextField] of followUps) {
      const response = await agentService.receiveWebMessage({
        farmerId: farmer.farmer_id,
        farmId: farms[0].farm_id,
        text,
        externalMessageId: `message-${suffix}-${nextField}`,
      });
      assert.equal(response.conversation.state, 'awaiting_missing_field');
      assert.equal(response.conversation.pending_field, nextField);
    }

    const ready = await agentService.receiveWebMessage({
      farmerId: farmer.farmer_id,
      farmId: farms[0].farm_id,
      text: 'I did not irrigate',
      externalMessageId: `message-${suffix}-irrigation`,
    });
    assert.equal(ready.conversation.state, 'awaiting_submission_confirmation');
    assert.match(ready.reply, /Please confirm this farm observation/);

    const submitted = await agentService.receiveWebMessage({
      farmerId: farmer.farmer_id,
      farmId: farms[0].farm_id,
      text: 'YES',
      externalMessageId: `message-${suffix}-submit`,
    });
    assert.equal(submitted.conversation.state, 'submitted');
    assert.equal(submitted.conversation.status, 'submitted');
    assert.equal(submitted.virtualNdani?.device_code, `NDANI-ODZI-${siteId.slice(-3)}`);
    assert.equal(submitted.virtualNdani?.quality_status, 'accepted');
    assert.equal(submitted.virtualNdani?.model_ready, true);
    assert.equal(submitted.virtualNdani?.eligible_feature_count, 5);
    assert.match(submitted.reply, /No model has been trained or changed yet/i);

    const observationResult = await db.query(
      `
        SELECT payload_json, validation_status, review_status
        FROM manual_observations
        WHERE site_id = $1
        ORDER BY submitted_at DESC
        LIMIT 1
      `,
      [siteId]
    );
    assert.equal(observationResult.rows.length, 1);
    const payload = JSON.parse(observationResult.rows[0].payload_json);
    assert.equal(payload.crop_type, 'maize');
    assert.equal(payload.crop_stage, 'vegetative');
    assert.equal(payload.irrigated_today, 'no');
    assert.equal(observationResult.rows[0].validation_status, 'valid');

    const virtualReadingResult = await db.query(
      `
        SELECT
          reading.reading_id,
          reading.conversation_id,
          reading.manual_observation_id,
          reading.collection_mode,
          reading.quality_status,
          cycle.status AS cycle_status,
          device.status AS device_status
        FROM virtual_ndani_readings reading
        JOIN virtual_ndani_cycles cycle ON cycle.cycle_id = reading.cycle_id
        JOIN virtual_ndani_devices device
          ON device.virtual_device_id = reading.virtual_device_id
        WHERE reading.conversation_id = $1
      `,
      [submitted.conversation.conversation_id]
    );
    assert.equal(virtualReadingResult.rows.length, 1);
    assert.equal(virtualReadingResult.rows[0].collection_mode, 'manual_agent');
    assert.equal(virtualReadingResult.rows[0].quality_status, 'accepted');
    assert.equal(virtualReadingResult.rows[0].cycle_status, 'batched');
    assert.equal(virtualReadingResult.rows[0].device_status, 'contribution_recorded');
    assert.ok(virtualReadingResult.rows[0].manual_observation_id);

    const virtualFields = await db.query(
      `
        SELECT channel_key, value_json, measurement_kind, source_class, source_reference
        FROM virtual_ndani_reading_fields
        WHERE reading_id = $1
      `,
      [virtualReadingResult.rows[0].reading_id]
    );
    assert.equal(virtualFields.rows.length, 8);
    assert.equal(
      virtualFields.rows.filter((field) => field.measurement_kind === 'unavailable').length,
      3
    );
    assert.equal(
      virtualFields.rows.filter((field) => field.source_class === 'manual_proxy').length,
      5
    );
    assert.ok(
      virtualFields.rows
        .filter((field) => field.measurement_kind === 'unavailable')
        .every((field) => field.value_json === null && field.source_class === null)
    );

    const agentContribution = await db.query(
      `
        SELECT batch.status, batch.eligible_feature_count, batch.excluded_feature_count
        FROM virtual_ndani_batch_readings link
        JOIN virtual_ndani_batches batch ON batch.batch_id = link.batch_id
        WHERE link.reading_id = $1
      `,
      [virtualReadingResult.rows[0].reading_id]
    );
    assert.equal(agentContribution.rows.length, 1);
    assert.equal(agentContribution.rows[0].status, 'model_ready');
    assert.equal(Number(agentContribution.rows[0].eligible_feature_count), 5);
    assert.equal(Number(agentContribution.rows[0].excluded_feature_count), 3);

    const replayedSubmit = await agentService.receiveWebMessage({
      farmerId: farmer.farmer_id,
      farmId: farms[0].farm_id,
      text: 'YES',
      externalMessageId: `message-${suffix}-submit`,
    });
    assert.equal(replayedSubmit.duplicate, true);
    const readingCount = await db.query(
      `
        SELECT COUNT(*)::int AS count
        FROM virtual_ndani_readings
        WHERE conversation_id = $1
      `,
      [submitted.conversation.conversation_id]
    );
    assert.equal(Number(readingCount.rows[0].count), 1);

    const completedTranscript = await agentService.getLatestWebConversation({
      farmerId: farmer.farmer_id,
      farmId: farms[0].farm_id,
    });
    assert.equal(completedTranscript?.messages.length, 16);
    assert.equal(completedTranscript?.messages[0].direction, 'inbound');
    assert.equal(completedTranscript?.messages[15].direction, 'outbound');

    await assert.rejects(
      agentService.receiveWebMessage({
        farmerId: farmer.farmer_id,
        farmId: '00000000-0000-0000-0000-000000000000',
        text: 'hello',
      }),
      /farm_not_found/
    );

    console.log('Agent database integration tests passed');
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
