import { NextFunction, Request, Response } from 'express';
import { authRepository, AuthenticatedFarmer } from './authRepository';
import { hashSessionToken, readSessionToken } from './session';

export interface FarmerRequest extends Request {
  farmer?: AuthenticatedFarmer;
  sessionTokenHash?: string;
}

export async function requireFarmerSession(
  req: FarmerRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = readSessionToken(req);
    if (!token) {
      res.status(401).json({ error: 'authentication_required' });
      return;
    }
    const tokenHash = hashSessionToken(token);
    const farmer = await authRepository.findActiveSession(
      tokenHash,
      Math.floor(Date.now() / 1000)
    );
    if (!farmer) {
      res.status(401).json({ error: 'invalid_or_expired_session' });
      return;
    }
    req.farmer = farmer;
    req.sessionTokenHash = tokenHash;
    next();
  } catch (error) {
    next(error);
  }
}

export async function requireCoordinator(
  req: FarmerRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  await requireFarmerSession(req, res, () => {
    if (req.farmer?.system_role !== 'coordinator') {
      res.status(403).json({ error: 'coordinator_access_required' });
      return;
    }
    next();
  });
}
