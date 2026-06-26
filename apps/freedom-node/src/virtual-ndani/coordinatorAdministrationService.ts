import crypto from 'crypto';
import { authService } from '../auth/authService';
import { hashPilotPin } from '../auth/pin';
import { db } from '../database';
import { virtualNdaniService } from './service';

const FARMER_STATUSES = ['active', 'suspended', 'withdrawn'] as const;
const LANGUAGES = ['en', 'sn', 'sn-en'] as const;

export class CoordinatorAdministrationError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number
  ) {
    super(code);
  }
}

export const coordinatorAdministrationService = {
  async listFarmers() {
    const result = await db.query(
      `
        SELECT
          farmer.farmer_id,
          farmer.pilot_code,
          farmer.display_name,
          farmer.preferred_language,
          farmer.status,
          farmer.created_at,
          farm.farm_id,
          farm.site_id,
          farm.display_name AS farm_display_name,
          device.virtual_device_id,
          device.device_code,
          device.status AS device_status,
          credential.last_used_at,
          credential.failed_attempts,
          credential.locked_until,
          COALESCE(session_count.active_sessions, 0)::int AS active_sessions,
          COALESCE(usage.input_tokens, 0)::bigint AS gemini_input_tokens,
          COALESCE(usage.output_tokens, 0)::bigint AS gemini_output_tokens,
          COALESCE(usage.estimated_cost_usd, 0)::float AS gemini_estimated_cost_usd,
          COALESCE(usage.request_count, 0)::int AS gemini_request_count
        FROM farmers farmer
        LEFT JOIN farmer_credentials credential
          ON credential.farmer_id = farmer.farmer_id
          AND credential.credential_type = 'pin'
        LEFT JOIN LATERAL (
          SELECT membership.farm_id
          FROM farm_memberships membership
          WHERE membership.farmer_id = farmer.farmer_id
            AND membership.valid_to IS NULL
          ORDER BY membership.valid_from
          LIMIT 1
        ) membership ON TRUE
        LEFT JOIN farms farm ON farm.farm_id = membership.farm_id
        LEFT JOIN virtual_ndani_devices device ON device.farm_id = farm.farm_id
        LEFT JOIN LATERAL (
          SELECT COUNT(*) AS active_sessions
          FROM farmer_sessions session
          WHERE session.farmer_id = farmer.farmer_id
            AND session.revoked_at IS NULL
            AND session.expires_at > EXTRACT(EPOCH FROM NOW())::BIGINT
        ) session_count ON TRUE
        LEFT JOIN LATERAL (
          SELECT
            COALESCE(SUM(input_tokens), 0) AS input_tokens,
            COALESCE(SUM(output_tokens), 0) AS output_tokens,
            COALESCE(SUM(estimated_cost_usd), 0) AS estimated_cost_usd,
            COUNT(*) AS request_count
          FROM agent_cost_events cost
          WHERE cost.farmer_id = farmer.farmer_id
            AND cost.provider = 'gemini'
        ) usage ON TRUE
        WHERE farmer.system_role = 'farmer'
        ORDER BY farmer.pilot_code
      `
    );
    return result.rows.map(normalizeFarmer);
  },

  async enrollFarmer(input: {
    pilotCode: unknown;
    displayName: unknown;
    preferredLanguage: unknown;
    pin: unknown;
    siteId: unknown;
    farmDisplayName: unknown;
    coordinatorId: string;
  }) {
    try {
      const farmer = await authService.enroll({
        pilotCode: String(input.pilotCode ?? ''),
        displayName: String(input.displayName ?? ''),
        preferredLanguage: String(input.preferredLanguage ?? ''),
        pin: String(input.pin ?? ''),
        siteId: String(input.siteId ?? ''),
        farmDisplayName: String(input.farmDisplayName ?? ''),
      });
      await virtualNdaniService.list(farmer.farmer_id);
      await audit(input.coordinatorId, 'farmer_enrolled', farmer.farmer_id, {
        pilot_code: farmer.pilot_code,
      });
      return this.findFarmer(farmer.farmer_id);
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new CoordinatorAdministrationError('pilot_code_or_site_already_exists', 409);
      }
      throw error;
    }
  },

  async updateFarmer(input: {
    farmerId: string;
    displayName: unknown;
    preferredLanguage: unknown;
    status: unknown;
    farmDisplayName: unknown;
    coordinatorId: string;
  }) {
    const current = await this.findFarmer(input.farmerId);
    const displayName = requiredText(input.displayName, 'display_name', 100);
    const farmDisplayName = requiredText(input.farmDisplayName, 'farm_display_name', 120);
    const preferredLanguage = enumValue(input.preferredLanguage, LANGUAGES, 'invalid_language');
    const status = enumValue(input.status, FARMER_STATUSES, 'invalid_farmer_status');

    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `
          UPDATE farmers
          SET display_name = $1,
              preferred_language = $2,
              status = $3,
              updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT
          WHERE farmer_id = $4 AND system_role = 'farmer'
        `,
        [displayName, preferredLanguage, status, input.farmerId]
      );
      if (current.farm_id) {
        await client.query(
          `
            UPDATE farms
            SET display_name = $1,
                status = $2,
                updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT
            WHERE farm_id = $3
          `,
          [farmDisplayName, status === 'active' ? 'active' : 'inactive', current.farm_id]
        );
      }
      if (status !== 'active') {
        await client.query(
          `
            UPDATE farmer_sessions
            SET revoked_at = EXTRACT(EPOCH FROM NOW())::BIGINT
            WHERE farmer_id = $1 AND revoked_at IS NULL
          `,
          [input.farmerId]
        );
      }
      await insertAudit(client, input.coordinatorId, 'farmer_updated', input.farmerId, {
        display_name: displayName,
        preferred_language: preferredLanguage,
        status,
        farm_display_name: farmDisplayName,
      });
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    return this.findFarmer(input.farmerId);
  },

  async resetPin(input: {
    farmerId: string;
    pin: unknown;
    coordinatorId: string;
  }) {
    await this.findFarmer(input.farmerId);
    const pinHash = await hashPilotPin(String(input.pin ?? ''));
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `
          UPDATE farmer_credentials
          SET secret_hash = $1,
              failed_attempts = 0,
              locked_until = NULL,
              last_used_at = NULL
          WHERE farmer_id = $2 AND credential_type = 'pin'
        `,
        [pinHash, input.farmerId]
      );
      await client.query(
        `
          UPDATE farmer_sessions
          SET revoked_at = EXTRACT(EPOCH FROM NOW())::BIGINT
          WHERE farmer_id = $1 AND revoked_at IS NULL
        `,
        [input.farmerId]
      );
      await insertAudit(client, input.coordinatorId, 'farmer_pin_reset', input.farmerId, {});
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    return { farmer_id: input.farmerId, sessions_revoked: true };
  },

  async deleteFarmer(input: {
    farmerId: string;
    coordinatorId: string;
  }) {
    const current = await this.findFarmer(input.farmerId);
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await insertAudit(client, input.coordinatorId, 'farmer_deleted', input.farmerId, {
        pilot_code: current.pilot_code,
        farm_id: current.farm_id,
        site_id: current.site_id,
        virtual_device_id: current.virtual_device_id,
        device_code: current.device_code,
      });
      if (current.farm_id) {
        await client.query('DELETE FROM farms WHERE farm_id = $1', [current.farm_id]);
      }
      await client.query(
        'DELETE FROM farmers WHERE farmer_id = $1 AND system_role = $2',
        [input.farmerId, 'farmer']
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    return {
      farmer_id: input.farmerId,
      farm_id: current.farm_id,
      deleted: true,
    };
  },

  async findFarmer(farmerId: string) {
    if (!isUuid(farmerId)) {
      throw new CoordinatorAdministrationError('farmer_not_found', 404);
    }
    const farmers = await this.listFarmers();
    const farmer = farmers.find((candidate) => candidate.farmer_id === farmerId);
    if (!farmer) throw new CoordinatorAdministrationError('farmer_not_found', 404);
    return farmer;
  },
};

function normalizeFarmer(row: any) {
  return {
    ...row,
    created_at: Number(row.created_at),
    last_used_at: row.last_used_at === null ? null : Number(row.last_used_at),
    locked_until: row.locked_until === null ? null : Number(row.locked_until),
    failed_attempts: Number(row.failed_attempts ?? 0),
    active_sessions: Number(row.active_sessions ?? 0),
    gemini_input_tokens: Number(row.gemini_input_tokens ?? 0),
    gemini_output_tokens: Number(row.gemini_output_tokens ?? 0),
    gemini_estimated_cost_usd: Number(row.gemini_estimated_cost_usd ?? 0),
    gemini_request_count: Number(row.gemini_request_count ?? 0),
  };
}

async function audit(
  coordinatorId: string,
  eventType: string,
  farmerId: string,
  metadata: Record<string, unknown>
) {
  await db.query(
    `
      INSERT INTO audit_events (
        audit_event_id, actor_type, actor_id, event_type,
        subject_type, subject_id, metadata_json
      )
      VALUES ($1, 'coordinator', $2, $3, 'farmer', $4, $5)
    `,
    [crypto.randomUUID(), coordinatorId, eventType, farmerId, JSON.stringify(metadata)]
  );
}

async function insertAudit(
  client: { query: (text: string, values?: unknown[]) => Promise<unknown> },
  coordinatorId: string,
  eventType: string,
  farmerId: string,
  metadata: Record<string, unknown>
) {
  await client.query(
    `
      INSERT INTO audit_events (
        audit_event_id, actor_type, actor_id, event_type,
        subject_type, subject_id, metadata_json
      )
      VALUES ($1, 'coordinator', $2, $3, 'farmer', $4, $5)
    `,
    [crypto.randomUUID(), coordinatorId, eventType, farmerId, JSON.stringify(metadata)]
  );
}

function requiredText(value: unknown, field: string, maximum: number): string {
  const normalized = String(value ?? '').trim();
  if (!normalized || normalized.length > maximum) {
    throw new CoordinatorAdministrationError(`${field}_invalid`, 400);
  }
  return normalized;
}

function enumValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
  errorCode: string
): T {
  const normalized = String(value ?? '') as T;
  if (!allowed.includes(normalized)) {
    throw new CoordinatorAdministrationError(errorCode, 400);
  }
  return normalized;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(value);
}
