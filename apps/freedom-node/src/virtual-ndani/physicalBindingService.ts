import crypto from 'crypto';
import { db } from '../database';

const BINDING_VERSION = 'virtual-ndani-p256-binding-v1';
const CHALLENGE_SECONDS = 5 * 60;
const PHYSICAL_CHANNELS = [
  'temperature',
  'humidity',
  'pressure',
  'soil_moisture',
];

export class PhysicalBindingError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number
  ) {
    super(code);
  }
}

export const physicalBindingService = {
  async issueChallenge(params: {
    deviceId: string;
    devicePubkey: unknown;
    coordinatorId: string;
  }) {
    const devicePubkey = normalizeP256PublicKey(params.devicePubkey);
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const device = await client.query(
        `
          SELECT virtual_device_id, device_code, physical_device_pubkey
          FROM virtual_ndani_devices
          WHERE virtual_device_id = $1
          FOR UPDATE
        `,
        [params.deviceId]
      );
      if (!device.rows[0]) throw new PhysicalBindingError('virtual_ndani_not_found', 404);
      if (device.rows[0].physical_device_pubkey) {
        throw new PhysicalBindingError('virtual_ndani_already_bound', 409);
      }

      const registered = await client.query(
        'SELECT device_pubkey, device_id FROM devices WHERE device_pubkey = $1',
        [devicePubkey]
      );
      if (!registered.rows[0]) {
        throw new PhysicalBindingError('physical_device_not_registered', 409);
      }
      const used = await client.query(
        `
          SELECT virtual_device_id
          FROM virtual_ndani_devices
          WHERE physical_device_pubkey = $1
            AND virtual_device_id <> $2
        `,
        [devicePubkey, params.deviceId]
      );
      if (used.rows[0]) {
        throw new PhysicalBindingError('physical_device_already_bound', 409);
      }

      await client.query(
        `
          UPDATE virtual_ndani_physical_binding_challenges
          SET status = 'revoked', consumed_at = EXTRACT(EPOCH FROM NOW())::BIGINT
          WHERE virtual_device_id = $1 AND status = 'pending'
        `,
        [params.deviceId]
      );
      const challengeId = crypto.randomUUID();
      const challengeHex = crypto.randomBytes(32).toString('hex');
      const expiresAt = Math.floor(Date.now() / 1000) + CHALLENGE_SECONDS;
      await client.query(
        `
          INSERT INTO virtual_ndani_physical_binding_challenges (
            challenge_id, virtual_device_id, device_pubkey, challenge_hex,
            requested_by, expires_at
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          challengeId,
          params.deviceId,
          devicePubkey,
          challengeHex,
          params.coordinatorId,
          expiresAt,
        ]
      );
      await client.query('COMMIT');
      return {
        challenge_id: challengeId,
        virtual_device_id: params.deviceId,
        device_code: device.rows[0].device_code,
        device_pubkey: devicePubkey,
        challenge: challengeHex,
        signature_algorithm: 'ECDSA_P256_SHA256_IEEE_P1363',
        expires_at: expiresAt,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async verify(params: {
    deviceId: string;
    challengeId: unknown;
    signature: unknown;
    coordinatorId: string;
  }) {
    const challengeId = String(params.challengeId || '');
    const signature = String(params.signature || '').toLowerCase();
    if (!/^[0-9a-f]{128}$/.test(signature)) {
      throw new PhysicalBindingError('invalid_p256_signature_format', 400);
    }

    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `
          SELECT challenge.*, registry.device_id AS registry_device_id
          FROM virtual_ndani_physical_binding_challenges challenge
          JOIN devices registry ON registry.device_pubkey = challenge.device_pubkey
          WHERE challenge.challenge_id = $1
            AND challenge.virtual_device_id = $2
          FOR UPDATE OF challenge
        `,
        [challengeId, params.deviceId]
      );
      const challenge = result.rows[0];
      if (!challenge) throw new PhysicalBindingError('binding_challenge_not_found', 404);
      if (challenge.status !== 'pending') {
        throw new PhysicalBindingError('binding_challenge_already_consumed', 409);
      }
      const now = Math.floor(Date.now() / 1000);
      if (Number(challenge.expires_at) < now) {
        await client.query(
          `
            UPDATE virtual_ndani_physical_binding_challenges
            SET status = 'expired', consumed_at = $1
            WHERE challenge_id = $2
          `,
          [now, challengeId]
        );
        await client.query('COMMIT');
        throw new PhysicalBindingError('binding_challenge_expired', 410);
      }

      const valid = verifyP256Signature(
        challenge.device_pubkey,
        challenge.challenge_hex,
        signature
      );
      if (!valid) {
        await client.query(
          `
            UPDATE virtual_ndani_physical_binding_challenges
            SET status = 'failed', consumed_at = $1
            WHERE challenge_id = $2
          `,
          [now, challengeId]
        );
        await client.query('COMMIT');
        throw new PhysicalBindingError('invalid_physical_device_signature', 401);
      }

      const existing = await client.query(
        `
          SELECT physical_device_pubkey
          FROM virtual_ndani_devices
          WHERE virtual_device_id = $1
          FOR UPDATE
        `,
        [params.deviceId]
      );
      if (!existing.rows[0]) throw new PhysicalBindingError('virtual_ndani_not_found', 404);
      if (
        existing.rows[0].physical_device_pubkey
        && existing.rows[0].physical_device_pubkey !== challenge.device_pubkey
      ) {
        throw new PhysicalBindingError('virtual_ndani_already_bound', 409);
      }

      await client.query(
        `
          UPDATE virtual_ndani_devices
          SET mode = 'physical_bound',
              physical_device_pubkey = $1,
              physical_bound_at = $2,
              physical_binding_version = $3,
              updated_at = $2
          WHERE virtual_device_id = $4
        `,
        [challenge.device_pubkey, now, BINDING_VERSION, params.deviceId]
      );
      await client.query(
        `
          UPDATE virtual_ndani_channels
          SET physical_collection_enabled = channel_key = ANY($1::text[])
          WHERE virtual_device_id = $2
        `,
        [PHYSICAL_CHANNELS, params.deviceId]
      );
      await client.query(
        `
          INSERT INTO virtual_ndani_physical_bindings (
            binding_id, virtual_device_id, device_pubkey, registry_device_id,
            bound_by, binding_version, bound_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT DO NOTHING
        `,
        [
          crypto.randomUUID(),
          params.deviceId,
          challenge.device_pubkey,
          challenge.registry_device_id,
          params.coordinatorId,
          BINDING_VERSION,
          now,
        ]
      );
      await client.query(
        `
          UPDATE virtual_ndani_physical_binding_challenges
          SET status = 'verified', consumed_at = $1
          WHERE challenge_id = $2
        `,
        [now, challengeId]
      );
      await client.query(
        `
          INSERT INTO virtual_ndani_pipeline_events (
            pipeline_event_id, virtual_device_id, stage,
            execution_kind, status, detail_json
          )
          VALUES ($1, $2, 'physical_device_bound', 'real', 'verified', $3)
        `,
        [
          crypto.randomUUID(),
          params.deviceId,
          JSON.stringify({
            device_pubkey: challenge.device_pubkey,
            registry_device_id: challenge.registry_device_id,
            binding_version: BINDING_VERSION,
            historical_manual_readings_preserved: true,
            physical_channels_enabled: PHYSICAL_CHANNELS,
          }),
        ]
      );
      await client.query('COMMIT');
      return {
        virtual_device_id: params.deviceId,
        mode: 'physical_bound',
        physical_device_pubkey: challenge.device_pubkey,
        physical_bound_at: now,
        physical_channels_enabled: PHYSICAL_CHANNELS,
        historical_manual_readings_preserved: true,
      };
    } catch (error) {
      if (!(error instanceof PhysicalBindingError && [
        'binding_challenge_expired',
        'invalid_physical_device_signature',
      ].includes(error.code))) {
        await client.query('ROLLBACK');
      }
      throw error;
    } finally {
      client.release();
    }
  },
};

function normalizeP256PublicKey(value: unknown): string {
  const supplied = String(value || '').toLowerCase();
  const normalized = supplied.length === 130 && supplied.startsWith('04')
    ? supplied.slice(2)
    : supplied;
  if (!/^[0-9a-f]{128}$/.test(normalized)) {
    throw new PhysicalBindingError('invalid_p256_public_key_format', 400);
  }
  return normalized;
}

function verifyP256Signature(
  publicKeyHex: string,
  challengeHex: string,
  signatureHex: string
): boolean {
  try {
    const x = Buffer.from(publicKeyHex.slice(0, 64), 'hex').toString('base64url');
    const y = Buffer.from(publicKeyHex.slice(64), 'hex').toString('base64url');
    const key = crypto.createPublicKey({
      key: { kty: 'EC', crv: 'P-256', x, y },
      format: 'jwk',
    });
    return crypto.verify(
      'sha256',
      Buffer.from(challengeHex, 'hex'),
      { key, dsaEncoding: 'ieee-p1363' },
      Buffer.from(signatureHex, 'hex')
    );
  } catch {
    return false;
  }
}
