import crypto from 'crypto';
import { Router } from 'express';
import { authRepository } from '../auth/authRepository';
import { FarmerRequest, requireFarmerSession } from '../auth/authMiddleware';
import { AuthError, authService } from '../auth/authService';
import {
  clearSessionCookie,
  setSessionCookie,
} from '../auth/session';

const router = Router();

router.post('/enroll', async (req, res) => {
  try {
    const expectedKey = process.env.PILOT_ADMIN_ENROLLMENT_KEY;
    const providedKey = req.header('x-pilot-admin-key');
    if (!expectedKey || !providedKey || !safeEqual(expectedKey, providedKey)) {
      return res.status(403).json({ error: 'enrollment_not_authorized' });
    }
    const farmer = await authService.enroll({
      pilotCode: req.body.pilot_code,
      displayName: req.body.display_name,
      preferredLanguage: req.body.preferred_language,
      pin: req.body.pin,
      siteId: req.body.site_id,
      farmDisplayName: req.body.farm_display_name,
    });
    return res.status(201).json({
      success: true,
      farmer: publicFarmer(farmer),
    });
  } catch (error: any) {
    const duplicate = error?.code === '23505';
    return res.status(duplicate ? 409 : 400).json({
      error: duplicate ? 'pilot_code_or_site_already_exists' : error.message,
    });
  }
});

router.post('/enroll-coordinator', async (req, res) => {
  try {
    const expectedKey = process.env.PILOT_ADMIN_ENROLLMENT_KEY;
    const providedKey = req.header('x-pilot-admin-key');
    if (!expectedKey || !providedKey || !safeEqual(expectedKey, providedKey)) {
      return res.status(403).json({ error: 'enrollment_not_authorized' });
    }
    const coordinator = await authService.enrollCoordinator({
      pilotCode: req.body.pilot_code,
      displayName: req.body.display_name,
      preferredLanguage: req.body.preferred_language,
      pin: String(req.body.pin ?? ''),
    });
    return res.status(201).json({
      success: true,
      farmer: publicFarmer(coordinator),
    });
  } catch (error: any) {
    const duplicate = error?.code === '23505';
    return res.status(duplicate ? 409 : 400).json({
      error: duplicate ? 'pilot_code_already_exists' : error.message,
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const result = await authService.login(req.body.pilot_code, String(req.body.pin ?? ''));
    setSessionCookie(res, result.sessionToken);
    return res.json({
      success: true,
      farmer: publicFarmer(result.farmer),
      expires_at: result.expiresAt,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.status).json({ error: error.code });
    }
    return res.status(400).json({ error: (error as Error).message });
  }
});

router.post('/logout', requireFarmerSession, async (req: FarmerRequest, res) => {
  if (req.sessionTokenHash) {
    await authRepository.revokeSession(req.sessionTokenHash);
  }
  clearSessionCookie(res);
  return res.json({ success: true });
});

router.get('/session', requireFarmerSession, async (req: FarmerRequest, res) => {
  const farms = await authRepository.listFarms(req.farmer!.farmer_id);
  return res.json({
    authenticated: true,
    farmer: publicFarmer(req.farmer!),
    farms,
  });
});

function publicFarmer(farmer: {
  farmer_id: string;
  pilot_code: string;
  display_name: string;
  preferred_language: string;
}) {
  return {
    farmer_id: farmer.farmer_id,
    pilot_code: farmer.pilot_code,
    display_name: farmer.display_name,
    preferred_language: farmer.preferred_language,
    system_role: 'system_role' in farmer ? farmer.system_role : 'farmer',
  };
}

function safeEqual(expected: string, provided: string): boolean {
  const left = Buffer.from(expected);
  const right = Buffer.from(provided);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export { router as authRouter };
