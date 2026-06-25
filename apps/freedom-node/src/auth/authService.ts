import crypto from 'crypto';
import { authRepository, AuthenticatedFarmer } from './authRepository';
import { hashPilotPin, verifyPilotPin } from './pin';
import {
  createSessionToken,
  hashSessionToken,
  sessionLifetimeSeconds,
} from './session';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_SECONDS = 15 * 60;

export class AuthService {
  async enroll(input: {
    pilotCode: string;
    displayName: string;
    preferredLanguage?: string;
    pin: string;
    siteId: string;
    farmDisplayName?: string;
  }): Promise<AuthenticatedFarmer> {
    const pilotCode = normalizePilotCode(input.pilotCode);
    const siteId = normalizeSiteId(input.siteId);
    const displayName = input.displayName.trim();
    if (!displayName || displayName.length > 100) {
      throw new Error('displayName must contain 1 to 100 characters');
    }
    const pinHash = await hashPilotPin(input.pin);
    return authRepository.enroll({
      farmerId: crypto.randomUUID(),
      credentialId: crypto.randomUUID(),
      farmId: crypto.randomUUID(),
      pilotCode,
      displayName,
      preferredLanguage: normalizeLanguage(input.preferredLanguage),
      pinHash,
      siteId,
      farmDisplayName: input.farmDisplayName?.trim() || `${displayName} Farm`,
    });
  }

  async login(pilotCodeInput: string, pin: string): Promise<{
    farmer: AuthenticatedFarmer;
    sessionToken: string;
    expiresAt: number;
  }> {
    const pilotCode = normalizePilotCode(pilotCodeInput);
    const credential = await authRepository.findFarmerCredential(pilotCode);
    const now = Math.floor(Date.now() / 1000);

    if (!credential || credential.farmer.status !== 'active') {
      throw new AuthError('invalid_credentials', 401);
    }
    if (credential.locked_until && credential.locked_until > now) {
      throw new AuthError('account_temporarily_locked', 423);
    }

    const valid = await verifyPilotPin(pin, credential.secret_hash);
    if (!valid) {
      const failures = credential.failed_attempts + 1;
      const lockedUntil = failures >= MAX_LOGIN_ATTEMPTS ? now + LOCK_SECONDS : undefined;
      await authRepository.recordFailedLogin(credential.credential_id, failures, lockedUntil);
      throw new AuthError(
        lockedUntil ? 'account_temporarily_locked' : 'invalid_credentials',
        lockedUntil ? 423 : 401
      );
    }

    await authRepository.recordSuccessfulLogin(credential.credential_id);
    const sessionToken = createSessionToken();
    const expiresAt = now + sessionLifetimeSeconds();
    await authRepository.createSession({
      sessionId: crypto.randomUUID(),
      farmerId: credential.farmer.farmer_id,
      tokenHash: hashSessionToken(sessionToken),
      expiresAt,
    });
    return { farmer: credential.farmer, sessionToken, expiresAt };
  }

  async enrollCoordinator(input: {
    pilotCode: string;
    displayName: string;
    preferredLanguage?: string;
    pin: string;
  }): Promise<AuthenticatedFarmer> {
    const pilotCode = normalizePilotCode(input.pilotCode);
    const displayName = String(input.displayName || '').trim();
    if (!displayName || displayName.length > 100) {
      throw new Error('displayName must contain 1 to 100 characters');
    }
    return authRepository.createCoordinator({
      farmerId: crypto.randomUUID(),
      credentialId: crypto.randomUUID(),
      pilotCode,
      displayName,
      preferredLanguage: normalizeLanguage(input.preferredLanguage),
      pinHash: await hashPilotPin(input.pin),
    });
  }
}

export class AuthError extends Error {
  constructor(public readonly code: string, public readonly status: number) {
    super(code);
  }
}

function normalizePilotCode(value: string): string {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (!/^[A-Z0-9-]{3,24}$/.test(normalized)) {
    throw new Error('pilotCode must contain 3 to 24 letters, numbers, or hyphens');
  }
  return normalized;
}

function normalizeSiteId(value: string): string {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!/^site-\d{3}$/.test(normalized)) {
    throw new Error('siteId must look like site-001');
  }
  return normalized;
}

function normalizeLanguage(value?: string): string {
  const normalized = String(value || 'en').trim().toLowerCase();
  return ['en', 'sn', 'sn-en'].includes(normalized) ? normalized : 'en';
}

export const authService = new AuthService();
