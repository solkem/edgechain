import crypto from 'crypto';
import { db } from '../database';
import { prepareAcceptedReadingContribution } from './contributionPipeline';

const PACKET_BYTES = 144;
const SIGNED_BYTES = 80;
const PACKET_VERSION = 'esp32-ndani-datapacket-v1';

export class PhysicalReadingError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number
  ) {
    super(code);
  }
}

export const physicalReadingService = {
  async ingest(input: {
    devicePubkey: unknown;
    packetHex: unknown;
    transport?: unknown;
  }) {
    const devicePubkey = normalizePublicKey(input.devicePubkey);
    const packetHex = String(input.packetHex || '').toLowerCase();
    if (!new RegExp(`^[0-9a-f]{${PACKET_BYTES * 2}}$`).test(packetHex)) {
      throw new PhysicalReadingError('invalid_ndani_packet_format', 400);
    }
    const packet = Buffer.from(packetHex, 'hex');
    const signedPayload = packet.subarray(0, SIGNED_BYTES);
    const signature = packet.subarray(SIGNED_BYTES);
    if (!verifyP256(devicePubkey, signedPayload, signature)) {
      throw new PhysicalReadingError('invalid_physical_reading_signature', 401);
    }

    const parsed = parsePacket(packet);
    validateSensorRanges(parsed);
    const packetHash = crypto.createHash('sha256').update(packet).digest('hex');
    const now = Math.floor(Date.now() / 1000);
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const deviceResult = await client.query(
        `
          SELECT device.*, farm.farm_id
          FROM virtual_ndani_devices device
          JOIN farms farm ON farm.farm_id = device.farm_id
          WHERE device.physical_device_pubkey = $1
            AND device.mode = 'physical_bound'
          FOR UPDATE OF device
        `,
        [devicePubkey]
      );
      const device = deviceResult.rows[0];
      if (!device) throw new PhysicalReadingError('physical_device_not_bound', 403);
      const duplicate = await client.query(
        `
          SELECT reading_id
          FROM virtual_ndani_physical_packets
          WHERE packet_hash = $1
        `,
        [packetHash]
      );
      if (duplicate.rows[0]) {
        await client.query('COMMIT');
        return {
          duplicate: true,
          reading_id: duplicate.rows[0].reading_id,
          virtual_device_id: device.virtual_device_id,
        };
      }

      const cycleId = crypto.randomUUID();
      const readingId = crypto.randomUUID();
      await client.query(
        `
          INSERT INTO virtual_ndani_cycles (
            cycle_id, virtual_device_id, scheduled_for, due_at, started_at,
            completed_at, status, collection_mode, created_by
          )
          VALUES ($1, $2, $3, $3, $3, $3, 'accepted', 'physical_auto', $4)
        `,
        [cycleId, device.virtual_device_id, now, `physical:${devicePubkey}`]
      );
      await client.query(
        `
          INSERT INTO virtual_ndani_readings (
            reading_id, virtual_device_id, cycle_id, farmer_id, farm_id,
            collection_mode, observed_at, recorded_at, confirmed_at,
            quality_status, schema_version, policy_version,
            physical_packet_hash, device_timestamp, received_at,
            signature_verified
          )
          VALUES (
            $1, $2, $3, NULL, $4, 'physical_auto', $5, $5, $5,
            'accepted', 'virtual-ndani-physical-reading-v1',
            'physical-sensor-policy-v1', $6, $7, $5, TRUE
          )
        `,
        [
          readingId,
          device.virtual_device_id,
          cycleId,
          device.farm_id,
          now,
          packetHash,
          parsed.deviceTimestamp,
        ]
      );

      const fields = [
        physicalField('temperature', parsed.temperature, '°C', packetHash),
        physicalField('humidity', parsed.humidity, '%', packetHash),
        physicalField('soil_moisture', parsed.soilMoisture, '%', packetHash),
        unavailableField('pressure', 'not_transmitted_by_esp32_ndani_datapacket_v1'),
        unavailableField('rain_condition', 'human_or_external_context_channel'),
        unavailableField('plant_condition', 'human_observation_channel'),
        unavailableField('pest_disease_signs', 'human_observation_channel'),
        unavailableField('irrigation', 'human_or_integration_event_channel'),
      ];
      for (const field of fields) {
        await client.query(
          `
            INSERT INTO virtual_ndani_reading_fields (
              reading_field_id, reading_id, channel_key, value_json, unit,
              measurement_kind, source_class, source_reference, confidence,
              evidence, review_status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'accepted')
          `,
          [
            crypto.randomUUID(),
            readingId,
            field.channelKey,
            field.value === null ? null : JSON.stringify(field.value),
            field.unit,
            field.measurementKind,
            field.sourceClass,
            field.sourceReference,
            field.confidence,
            field.evidence,
          ]
        );
      }
      await client.query(
        `
          INSERT INTO virtual_ndani_physical_packets (
            packet_id, virtual_device_id, reading_id, device_pubkey,
            packet_version, packet_hash, commitment_hex, nullifier_hex,
            signature_hex, device_timestamp, received_at,
            signature_verified, transport
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, TRUE, $12)
        `,
        [
          crypto.randomUUID(),
          device.virtual_device_id,
          readingId,
          devicePubkey,
          PACKET_VERSION,
          packetHash,
          parsed.commitment,
          parsed.nullifier,
          signature.toString('hex'),
          parsed.deviceTimestamp,
          now,
          normalizeTransport(input.transport),
        ]
      );
      await insertEvent(client, {
        deviceId: device.virtual_device_id,
        cycleId,
        readingId,
        stage: 'physical_packet_verified',
        executionKind: 'real',
        status: 'accepted',
        detail: {
          packet_version: PACKET_VERSION,
          packet_hash: packetHash,
          signature_algorithm: 'ECDSA_P256_SHA256_IEEE_P1363',
          measured_channels: ['temperature', 'humidity', 'soil_moisture'],
          unavailable_channels: ['pressure'],
        },
      });
      await prepareAcceptedReadingContribution(client, {
        deviceId: device.virtual_device_id,
        cycleId,
        readingId,
      });
      await client.query('COMMIT');
      return {
        duplicate: false,
        virtual_device_id: device.virtual_device_id,
        reading_id: readingId,
        packet_hash: packetHash,
        signature_verified: true,
        measured_channels: ['temperature', 'humidity', 'soil_moisture'],
        unavailable_channels: ['pressure'],
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async comparison(deviceId: string) {
    const [physical, manual, coverage] = await Promise.all([
      db.query(
        `
          SELECT reading.reading_id, reading.observed_at,
            MAX(CASE WHEN field.channel_key = 'temperature'
              THEN field.value_json END) AS temperature,
            MAX(CASE WHEN field.channel_key = 'humidity'
              THEN field.value_json END) AS humidity,
            MAX(CASE WHEN field.channel_key = 'soil_moisture'
              THEN field.value_json END) AS soil_moisture
          FROM virtual_ndani_readings reading
          JOIN virtual_ndani_reading_fields field ON field.reading_id = reading.reading_id
          WHERE reading.virtual_device_id = $1
            AND reading.collection_mode = 'physical_auto'
            AND reading.quality_status = 'accepted'
          GROUP BY reading.reading_id
          ORDER BY reading.observed_at DESC
          LIMIT 1
        `,
        [deviceId]
      ),
      db.query(
        `
          SELECT reading.reading_id, reading.observed_at,
            MAX(CASE WHEN field.channel_key = 'soil_moisture'
              THEN field.value_json END) AS soil_moisture,
            MAX(CASE WHEN field.channel_key = 'plant_condition'
              THEN field.value_json END) AS plant_condition,
            MAX(CASE WHEN field.channel_key = 'pest_disease_signs'
              THEN field.value_json END) AS pest_disease_signs
          FROM virtual_ndani_readings reading
          JOIN virtual_ndani_reading_fields field ON field.reading_id = reading.reading_id
          WHERE reading.virtual_device_id = $1
            AND reading.collection_mode IN (
              'manual_guided', 'manual_agent', 'coordinator_assisted'
            )
            AND reading.quality_status IN ('accepted', 'flagged')
          GROUP BY reading.reading_id
          ORDER BY reading.observed_at DESC
          LIMIT 1
        `,
        [deviceId]
      ),
      db.query(
        `
          SELECT
            COUNT(*) FILTER (WHERE collection_mode = 'physical_auto')::int
              AS physical_readings,
            COUNT(*) FILTER (WHERE collection_mode IN (
              'manual_guided', 'manual_agent', 'coordinator_assisted'
            ))::int
              AS human_readings,
            MIN(observed_at) FILTER (WHERE collection_mode = 'physical_auto')
              AS first_physical_at,
            MAX(observed_at) FILTER (WHERE collection_mode = 'physical_auto')
              AS last_physical_at
          FROM virtual_ndani_readings
          WHERE virtual_device_id = $1
            AND quality_status IN ('accepted', 'flagged')
        `,
        [deviceId]
      ),
    ]);
    return {
      comparison_version: 'manual-physical-side-by-side-v1',
      interpretation:
        'Physical percentages and farmer categories are shown side by side. '
        + 'They are not treated as equivalent measurements or scored for agreement.',
      latest_physical: normalizeComparisonRow(physical.rows[0]),
      latest_human: normalizeComparisonRow(manual.rows[0]),
      coverage: {
        physical_readings: Number(coverage.rows[0].physical_readings),
        human_readings: Number(coverage.rows[0].human_readings),
        first_physical_at: nullableNumber(coverage.rows[0].first_physical_at),
        last_physical_at: nullableNumber(coverage.rows[0].last_physical_at),
      },
    };
  },
};

function parsePacket(packet: Buffer) {
  return {
    commitment: packet.subarray(0, 32).toString('hex'),
    temperature: packet.readFloatLE(32),
    humidity: packet.readFloatLE(36),
    soilMoisture: packet.readFloatLE(40),
    deviceTimestamp: packet.readUInt32LE(44),
    nullifier: packet.subarray(48, 80).toString('hex'),
  };
}

function validateSensorRanges(data: ReturnType<typeof parsePacket>) {
  if (!Number.isFinite(data.temperature) || data.temperature < -40 || data.temperature > 85) {
    throw new PhysicalReadingError('temperature_out_of_range', 422);
  }
  if (!Number.isFinite(data.humidity) || data.humidity < 0 || data.humidity > 100) {
    throw new PhysicalReadingError('humidity_out_of_range', 422);
  }
  if (!Number.isFinite(data.soilMoisture) || data.soilMoisture < 0 || data.soilMoisture > 100) {
    throw new PhysicalReadingError('soil_moisture_out_of_range', 422);
  }
}

function verifyP256(publicKeyHex: string, payload: Buffer, signature: Buffer): boolean {
  try {
    const x = Buffer.from(publicKeyHex.slice(0, 64), 'hex').toString('base64url');
    const y = Buffer.from(publicKeyHex.slice(64), 'hex').toString('base64url');
    const key = crypto.createPublicKey({
      key: { kty: 'EC', crv: 'P-256', x, y },
      format: 'jwk',
    });
    return crypto.verify(
      'sha256',
      payload,
      { key, dsaEncoding: 'ieee-p1363' },
      signature
    );
  } catch {
    return false;
  }
}

function normalizePublicKey(value: unknown) {
  const supplied = String(value || '').toLowerCase();
  const key = supplied.length === 130 && supplied.startsWith('04')
    ? supplied.slice(2)
    : supplied;
  if (!/^[0-9a-f]{128}$/.test(key)) {
    throw new PhysicalReadingError('invalid_p256_public_key_format', 400);
  }
  return key;
}

function physicalField(
  channelKey: string,
  value: number,
  unit: string,
  packetHash: string
) {
  return {
    channelKey,
    value,
    unit,
    measurementKind: 'measured',
    sourceClass: 'physical_sensor',
    sourceReference: `packet:${packetHash}`,
    confidence: 1,
    evidence: PACKET_VERSION,
  };
}

function unavailableField(channelKey: string, reason: string) {
  return {
    channelKey,
    value: null,
    unit: null,
    measurementKind: 'unavailable',
    sourceClass: null,
    sourceReference: reason,
    confidence: null,
    evidence: reason,
  };
}

function normalizeTransport(value: unknown) {
  const transport = String(value || 'freedom_node_adapter');
  return ['lora', 'ble', 'freedom_node_adapter', 'test_fixture'].includes(transport)
    ? transport
    : 'freedom_node_adapter';
}

async function insertEvent(
  client: any,
  event: {
    deviceId: string;
    cycleId: string;
    readingId: string;
    stage: string;
    executionKind: string;
    status: string;
    detail: Record<string, unknown>;
  }
) {
  await client.query(
    `
      INSERT INTO virtual_ndani_pipeline_events (
        pipeline_event_id, virtual_device_id, cycle_id, reading_id,
        stage, execution_kind, status, detail_json
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    [
      crypto.randomUUID(),
      event.deviceId,
      event.cycleId,
      event.readingId,
      event.stage,
      event.executionKind,
      event.status,
      JSON.stringify(event.detail),
    ]
  );
}

function normalizeComparisonRow(row: any) {
  if (!row) return null;
  const normalized: Record<string, unknown> = {
    reading_id: row.reading_id,
    observed_at: Number(row.observed_at),
  };
  for (const [key, value] of Object.entries(row)) {
    if (['reading_id', 'observed_at'].includes(key) || value === null) continue;
    normalized[key] = parseJsonScalar(value);
  }
  return normalized;
}

function parseJsonScalar(value: unknown) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function nullableNumber(value: unknown) {
  return value === null || value === undefined ? null : Number(value);
}
