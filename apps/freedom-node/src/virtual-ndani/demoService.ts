import crypto from 'crypto';
import { db } from '../database';

const DEMO_VERSION = 'physical-ndani-education-v1';
const DISCLAIMER_VERSION = 'demonstration-data-non-evidentiary-v1';
const RETENTION_SECONDS = 24 * 60 * 60;

export class DemoSessionError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number
  ) {
    super(code);
  }
}

export const demoService = {
  async create(params: {
    farmerId: string;
    deviceId: string;
  }) {
    await this.cleanupExpired();
    const owned = await db.query(
      `
        SELECT device.virtual_device_id, device.device_code
        FROM virtual_ndani_devices device
        JOIN farm_memberships membership ON membership.farm_id = device.farm_id
        WHERE device.virtual_device_id = $1
          AND membership.farmer_id = $2
          AND membership.valid_from <= EXTRACT(EPOCH FROM NOW())::BIGINT
          AND (
            membership.valid_to IS NULL
            OR membership.valid_to > EXTRACT(EPOCH FROM NOW())::BIGINT
          )
        LIMIT 1
      `,
      [params.deviceId, params.farmerId]
    );
    if (!owned.rows[0]) throw new DemoSessionError('virtual_ndani_not_found', 404);

    const sessionId = crypto.randomUUID();
    const createdAt = Math.floor(Date.now() / 1000);
    const expiresAt = createdAt + RETENTION_SECONDS;
    const events = buildDemoEvents(sessionId);
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `
          INSERT INTO virtual_ndani_demo_sessions (
            demo_session_id, virtual_device_id, started_by, status,
            demo_version, disclaimer_version, expires_at, created_at
          )
          VALUES ($1, $2, $3, 'complete', $4, $5, $6, $7)
        `,
        [
          sessionId,
          params.deviceId,
          params.farmerId,
          DEMO_VERSION,
          DISCLAIMER_VERSION,
          expiresAt,
          createdAt,
        ]
      );
      for (const event of events) {
        await client.query(
          `
            INSERT INTO virtual_ndani_demo_events (
              demo_event_id, demo_session_id, sequence_number, stage,
              execution_kind, status, synthetic_values_json,
              explanation, offset_seconds
            )
            VALUES ($1, $2, $3, $4, 'simulated', $5, $6, $7, $8)
          `,
          [
            event.demo_event_id,
            sessionId,
            event.sequence_number,
            event.stage,
            event.status,
            JSON.stringify(event.synthetic_values),
            event.explanation,
            event.offset_seconds,
          ]
        );
      }
      await client.query('COMMIT');
      return {
        demo_session_id: sessionId,
        virtual_device_id: params.deviceId,
        device_code: owned.rows[0].device_code,
        status: 'complete',
        demo_version: DEMO_VERSION,
        expires_at: expiresAt,
        demonstration_data: true,
        non_evidentiary: true,
        disclaimer:
          'DEMONSTRATION DATA — These synthetic values did not come from this farm. '
          + 'No physical device, proof, blockchain transaction, model update, score, '
          + 'reward, or payment occurred.',
        events: events.map((event) => ({
          ...event,
          execution_kind: 'simulated' as const,
        })),
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async get(params: {
    farmerId: string;
    deviceId: string;
    sessionId: string;
  }) {
    await this.cleanupExpired();
    const session = await db.query(
      `
        SELECT session.*, device.device_code
        FROM virtual_ndani_demo_sessions session
        JOIN virtual_ndani_devices device
          ON device.virtual_device_id = session.virtual_device_id
        JOIN farm_memberships membership ON membership.farm_id = device.farm_id
        WHERE session.demo_session_id = $1
          AND session.virtual_device_id = $2
          AND membership.farmer_id = $3
          AND session.status = 'complete'
          AND session.expires_at > EXTRACT(EPOCH FROM NOW())::BIGINT
        LIMIT 1
      `,
      [params.sessionId, params.deviceId, params.farmerId]
    );
    if (!session.rows[0]) throw new DemoSessionError('demo_session_not_found', 404);
    const events = await db.query(
      `
        SELECT *
        FROM virtual_ndani_demo_events
        WHERE demo_session_id = $1
        ORDER BY sequence_number
      `,
      [params.sessionId]
    );
    return hydrateSession(session.rows[0], events.rows);
  },

  async delete(params: {
    farmerId: string;
    deviceId: string;
    sessionId: string;
  }) {
    const result = await db.query(
      `
        DELETE FROM virtual_ndani_demo_sessions session
        USING virtual_ndani_devices device, farm_memberships membership
        WHERE session.demo_session_id = $1
          AND session.virtual_device_id = $2
          AND device.virtual_device_id = session.virtual_device_id
          AND membership.farm_id = device.farm_id
          AND membership.farmer_id = $3
        RETURNING session.demo_session_id
      `,
      [params.sessionId, params.deviceId, params.farmerId]
    );
    if (!result.rows[0]) throw new DemoSessionError('demo_session_not_found', 404);
    return { deleted: true, demo_session_id: params.sessionId };
  },

  async cleanupExpired(now = Math.floor(Date.now() / 1000)) {
    const result = await db.query(
      `
        DELETE FROM virtual_ndani_demo_sessions
        WHERE expires_at <= $1
        RETURNING demo_session_id
      `,
      [now]
    );
    return result.rows.length;
  },
};

function buildDemoEvents(sessionId: string) {
  const samples = [
    { minute: 0, temperature: 22.4, humidity: 71.2, soil_moisture: 58.0 },
    { minute: 30, temperature: 23.1, humidity: 68.6, soil_moisture: 56.7 },
    { minute: 60, temperature: 24.0, humidity: 65.8, soil_moisture: 55.1 },
  ];
  const events: Array<{
    demo_event_id: string;
    sequence_number: number;
    stage: string;
    status: string;
    synthetic_values: Record<string, unknown>;
    explanation: string;
    offset_seconds: number;
  }> = [];
  let sequence = 1;
  for (const sample of samples) {
    events.push({
      demo_event_id: crypto.randomUUID(),
      sequence_number: sequence++,
      stage: 'sensor_collection',
      status: 'synthetic_reading_generated',
      synthetic_values: sample,
      explanation:
        'A future physical Ndani Kit would measure environmental channels automatically.',
      offset_seconds: sample.minute * 60,
    });
  }
  for (const event of [
    {
      stage: 'secure_element_signing',
      status: 'simulated',
      explanation:
        'ATECC608B would sign the packet without exposing its private key.',
    },
    {
      stage: 'lora_transmission',
      status: 'simulated',
      explanation:
        'The signed packet would travel by LoRa to the farmer-owned Freedom Node.',
    },
    {
      stage: 'freedom_node_validation',
      status: 'simulated',
      explanation:
        'The Freedom Node would validate source, ranges, replay protection, and provenance.',
    },
    {
      stage: 'privacy_proof',
      status: 'not_executed',
      explanation:
        'This screen only demonstrates the future privacy step. No ZK proof was generated.',
    },
    {
      stage: 'model_pipeline',
      status: 'not_executed',
      explanation:
        'No model was trained, updated, aggregated, scored, or rewarded.',
    },
  ]) {
    events.push({
      demo_event_id: crypto.randomUUID(),
      sequence_number: sequence++,
      ...event,
      synthetic_values: {},
      offset_seconds: 3900 + sequence * 5,
    });
  }
  return events;
}

function hydrateSession(session: any, events: any[]) {
  return {
    demo_session_id: session.demo_session_id,
    virtual_device_id: session.virtual_device_id,
    device_code: session.device_code,
    status: session.status,
    demo_version: session.demo_version,
    expires_at: Number(session.expires_at),
    demonstration_data: true,
    non_evidentiary: true,
    disclaimer:
      'DEMONSTRATION DATA — These synthetic values did not come from this farm. '
      + 'No physical device, proof, blockchain transaction, model update, score, '
      + 'reward, or payment occurred.',
    events: events.map((event) => ({
      demo_event_id: event.demo_event_id,
      sequence_number: Number(event.sequence_number),
      stage: event.stage,
      execution_kind: 'simulated',
      status: event.status,
      synthetic_values: parseJson(event.synthetic_values_json),
      explanation: event.explanation,
      offset_seconds: Number(event.offset_seconds),
    })),
  };
}

function parseJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
