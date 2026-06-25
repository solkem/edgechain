import { db } from '../database';

export interface AuthenticatedFarmer {
  farmer_id: string;
  pilot_code: string;
  display_name: string;
  preferred_language: string;
  status: string;
  system_role: 'farmer' | 'coordinator';
}

export interface FarmerFarm {
  farm_id: string;
  site_id: string;
  display_name: string;
  role: string;
  status: string;
}

export const authRepository = {
  async enroll(params: {
    farmerId: string;
    credentialId: string;
    farmId: string;
    pilotCode: string;
    displayName: string;
    preferredLanguage: string;
    pinHash: string;
    siteId: string;
    farmDisplayName: string;
  }): Promise<AuthenticatedFarmer> {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const farmerResult = await client.query(
        `
          INSERT INTO farmers
            (farmer_id, pilot_code, display_name, preferred_language, status)
          VALUES ($1, $2, $3, $4, 'active')
          RETURNING *
        `,
        [
          params.farmerId,
          params.pilotCode,
          params.displayName,
          params.preferredLanguage,
        ]
      );
      await client.query(
        `
          INSERT INTO farmer_credentials
            (credential_id, farmer_id, credential_type, secret_hash)
          VALUES ($1, $2, 'pin', $3)
        `,
        [params.credentialId, params.farmerId, params.pinHash]
      );
      await client.query(
        `
          INSERT INTO farms (farm_id, site_id, display_name)
          VALUES ($1, $2, $3)
        `,
        [params.farmId, params.siteId, params.farmDisplayName]
      );
      await client.query(
        `
          INSERT INTO farm_memberships (farmer_id, farm_id, role)
          VALUES ($1, $2, 'owner')
        `,
        [params.farmerId, params.farmId]
      );
      await client.query('COMMIT');
      return farmerResult.rows[0] as AuthenticatedFarmer;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async findFarmerCredential(pilotCode: string): Promise<{
    farmer: AuthenticatedFarmer;
    credential_id: string;
    secret_hash: string;
    failed_attempts: number;
    locked_until?: number;
  } | undefined> {
    const result = await db.query(
      `
        SELECT
          f.*,
          c.credential_id,
          c.secret_hash,
          c.failed_attempts,
          c.locked_until
        FROM farmers f
        JOIN farmer_credentials c ON c.farmer_id = f.farmer_id
        WHERE f.pilot_code = $1 AND c.credential_type = 'pin'
      `,
      [pilotCode]
    );
    if (!result.rows[0]) return undefined;
    const row = result.rows[0];
    return {
      farmer: {
        farmer_id: row.farmer_id,
        pilot_code: row.pilot_code,
        display_name: row.display_name,
          preferred_language: row.preferred_language,
          status: row.status,
          system_role: row.system_role,
      },
      credential_id: row.credential_id,
      secret_hash: row.secret_hash,
      failed_attempts: Number(row.failed_attempts ?? 0),
      locked_until: row.locked_until ? Number(row.locked_until) : undefined,
    };
  },

  async recordFailedLogin(credentialId: string, failedAttempts: number, lockedUntil?: number): Promise<void> {
    await db.query(
      `
        UPDATE farmer_credentials
        SET failed_attempts = $1, locked_until = $2
        WHERE credential_id = $3
      `,
      [failedAttempts, lockedUntil ?? null, credentialId]
    );
  },

  async recordSuccessfulLogin(credentialId: string): Promise<void> {
    await db.query(
      `
        UPDATE farmer_credentials
        SET failed_attempts = 0,
            locked_until = NULL,
            last_used_at = EXTRACT(EPOCH FROM NOW())::BIGINT
        WHERE credential_id = $1
      `,
      [credentialId]
    );
  },

  async createSession(params: {
    sessionId: string;
    farmerId: string;
    tokenHash: string;
    expiresAt: number;
  }): Promise<void> {
    await db.query(
      `
        INSERT INTO farmer_sessions
          (session_id, farmer_id, token_hash, expires_at)
        VALUES ($1, $2, $3, $4)
      `,
      [params.sessionId, params.farmerId, params.tokenHash, params.expiresAt]
    );
  },

  async findActiveSession(tokenHash: string, now: number): Promise<AuthenticatedFarmer | undefined> {
    const result = await db.query(
      `
        SELECT f.*
        FROM farmer_sessions s
        JOIN farmers f ON f.farmer_id = s.farmer_id
        WHERE s.token_hash = $1
          AND s.revoked_at IS NULL
          AND s.expires_at > $2
          AND f.status = 'active'
        LIMIT 1
      `,
      [tokenHash, now]
    );
    if (!result.rows[0]) return undefined;
    await db.query(
      `
        UPDATE farmer_sessions
        SET last_seen_at = $1
        WHERE token_hash = $2
      `,
      [now, tokenHash]
    );
    return result.rows[0] as AuthenticatedFarmer;
  },

  async revokeSession(tokenHash: string): Promise<void> {
    await db.query(
      `
        UPDATE farmer_sessions
        SET revoked_at = EXTRACT(EPOCH FROM NOW())::BIGINT
        WHERE token_hash = $1 AND revoked_at IS NULL
      `,
      [tokenHash]
    );
  },

  async listFarms(farmerId: string): Promise<FarmerFarm[]> {
    const result = await db.query(
      `
        SELECT farm.farm_id, farm.site_id, farm.display_name, farm.status, membership.role
        FROM farm_memberships membership
        JOIN farms farm ON farm.farm_id = membership.farm_id
        WHERE membership.farmer_id = $1
          AND membership.valid_from <= EXTRACT(EPOCH FROM NOW())::BIGINT
          AND (membership.valid_to IS NULL OR membership.valid_to > EXTRACT(EPOCH FROM NOW())::BIGINT)
        ORDER BY farm.site_id
      `,
      [farmerId]
    );
    return result.rows as FarmerFarm[];
  },

  async farmerCanAccessFarm(farmerId: string, farmId: string): Promise<boolean> {
    const result = await db.query(
      `
        SELECT 1
        FROM farm_memberships
        WHERE farmer_id = $1
          AND farm_id = $2
          AND valid_from <= EXTRACT(EPOCH FROM NOW())::BIGINT
          AND (valid_to IS NULL OR valid_to > EXTRACT(EPOCH FROM NOW())::BIGINT)
      `,
      [farmerId, farmId]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async createCoordinator(params: {
    farmerId: string;
    credentialId: string;
    pilotCode: string;
    displayName: string;
    preferredLanguage: string;
    pinHash: string;
  }): Promise<AuthenticatedFarmer> {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `
          INSERT INTO farmers (
            farmer_id, pilot_code, display_name, preferred_language,
            status, system_role
          )
          VALUES ($1, $2, $3, $4, 'active', 'coordinator')
          RETURNING *
        `,
        [
          params.farmerId,
          params.pilotCode,
          params.displayName,
          params.preferredLanguage,
        ]
      );
      await client.query(
        `
          INSERT INTO farmer_credentials (
            credential_id, farmer_id, credential_type, secret_hash
          )
          VALUES ($1, $2, 'pin', $3)
        `,
        [params.credentialId, params.farmerId, params.pinHash]
      );
      await client.query('COMMIT');
      return result.rows[0] as AuthenticatedFarmer;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
};
