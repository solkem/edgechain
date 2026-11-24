import crypto from 'crypto';
import { Router, urlencoded } from 'express';
import { authRepository } from '../auth/authRepository';
import {
  createSessionToken,
  hashSessionToken,
  sessionLifetimeSeconds,
  setSessionCookie,
} from '../auth/session';
import { db } from '../database';

const router = Router();
const callbackPath = '/api/v1/auth/google/callback';
const secure = process.env.NODE_ENV === 'production';
const cookieName = secure ? '__Host-edgechain-google' : 'edgechain-google';
const cookieOptions = { httpOnly: true, secure, sameSite: 'lax' as const, path: '/' };
const tokenPattern = /^[A-Za-z0-9_-]{43}$/;

function googleConfig() {
  const clientId = process.env.EDGECHAIN_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.EDGECHAIN_GOOGLE_CLIENT_SECRET;
  const baseUrl = process.env.EDGECHAIN_GOOGLE_APP_ORIGIN;
  if (!clientId || !clientSecret || !baseUrl) return undefined;
  let origin: URL;
  try {
    origin = new URL(baseUrl);
  } catch {
    return undefined;
  }
  if (
    (origin.protocol !== 'https:' && (secure || origin.protocol !== 'http:' || origin.hostname !== 'localhost')) ||
    origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash
  ) return undefined;
  return { clientId, clientSecret, origin: origin.origin, callback: origin.origin + callbackPath };
}

function pkceChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

router.use('/google', (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  res.set('Referrer-Policy', 'no-referrer');
  next();
});

router.post('/google/invites', async (req, res) => {
  const expected = process.env.PILOT_ADMIN_ENROLLMENT_KEY;
  const provided = req.header('x-pilot-admin-key');
  if (!expected || !provided || !crypto.timingSafeEqual(
    Buffer.from(hashSessionToken(expected), 'hex'),
    Buffer.from(hashSessionToken(provided), 'hex')
  )) return res.status(403).json({ error: 'enrollment_not_authorized' });

  try {
    const config = googleConfig();
    if (!config) return res.status(503).json({ error: 'google_sign_in_unavailable' });
    const pilotCode = String(req.body?.pilot_code ?? '').trim().toUpperCase();
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    if (!/^[A-Z0-9-]{3,24}$/.test(pilotCode) || email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: 'invalid_invite_details' });
    }
    const token = createSessionToken();
    const result = await db.query(`
      INSERT INTO farmer_google_invites (farmer_id, token_hash, google_email, expires_at)
      SELECT farmer_id, $2, $3, NOW() + INTERVAL '24 hours'
      FROM farmers
      WHERE pilot_code = $1 AND status = 'active'
        AND NOT EXISTS (SELECT 1 FROM farmer_google_identities g WHERE g.farmer_id = farmers.farmer_id)
      ON CONFLICT (farmer_id) DO UPDATE
      SET token_hash = EXCLUDED.token_hash, google_email = EXCLUDED.google_email,
          expires_at = EXCLUDED.expires_at
      RETURNING expires_at
    `, [pilotCode, hashSessionToken(token), email]);
    if (!result.rows[0]) return res.status(409).json({ error: 'account_not_eligible_for_invite' });
    const invite = new URL('/pilot-login', config.origin);
    invite.hash = 'google-invite=' + token;
    return res.status(201).json({ invite_url: invite.href, expires_at: result.rows[0].expires_at });
  } catch {
    return res.status(500).json({ error: 'invite_creation_failed' });
  }
});

router.get('/google/status', (_req, res) => {
  return res.json({ enabled: Boolean(googleConfig()) });
});

router.post('/google/start', urlencoded({ extended: false, limit: '1kb' }), (req, res) => {
  const config = googleConfig();
  if (!config) return res.status(503).send('Google sign-in is unavailable.');
  if (req.header('origin') !== config.origin) {
    return res.status(403).json({ error: 'untrusted_origin' });
  }
  const invite = req.body?.invite;
  if (invite !== undefined && (typeof invite !== 'string' || !tokenPattern.test(invite))) {
    return res.redirect('/pilot-login?google=failed');
  }
  const verifier = createSessionToken();
  const state = createSessionToken();
  res.cookie(cookieName, [state, verifier, invite ? hashSessionToken(invite) : ''].join('.'), {
    ...cookieOptions,
    maxAge: 10 * 60 * 1000,
  });

  const target = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  target.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.callback,
    response_type: 'code',
    scope: 'openid email',
    prompt: 'select_account',
    state,
    code_challenge: pkceChallenge(verifier),
    code_challenge_method: 'S256',
  }).toString();
  return res.redirect(303, target.href);
});

router.get('/google/callback', async (req, res) => {
  const cookie = req.headers.cookie?.split(';').map(value => value.trim())
    .find(value => value.startsWith(cookieName + '='));
  const [state, verifier, inviteHash] = (cookie?.slice(cookieName.length + 1) ?? '').split('.');
  const code = req.query.code;
  if (!tokenPattern.test(state) || !tokenPattern.test(verifier) || state !== req.query.state) {
    return res.redirect('/pilot-login?google=failed');
  }
  res.clearCookie(cookieName, cookieOptions);
  if (typeof code !== 'string' || !code) return res.redirect('/pilot-login?google=failed');

  try {
    const config = googleConfig();
    if (!config) return res.redirect('/pilot-login?google=failed');
    const exchange = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.callback,
        grant_type: 'authorization_code',
        code_verifier: verifier,
      }),
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
    });
    if (!exchange.ok) return res.redirect('/pilot-login?google=failed');
    const tokens = await exchange.json() as { access_token?: string };
    if (!tokens.access_token) return res.redirect('/pilot-login?google=failed');

    const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: 'Bearer ' + tokens.access_token },
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return res.redirect('/pilot-login?google=failed');
    const identity = await response.json() as { sub?: string; email?: string; email_verified?: boolean };
    if (typeof identity.sub !== 'string' || !identity.sub || identity.sub.length > 255) {
      return res.redirect('/pilot-login?google=failed');
    }

    let farmerId: string | undefined;
    if (inviteHash) {
      if (identity.email_verified !== true || typeof identity.email !== 'string') {
        return res.redirect('/pilot-login?google=failed');
      }
      const result = await db.query(`
        WITH redeemed AS (
          DELETE FROM farmer_google_invites i USING farmers f
          WHERE i.token_hash = $1 AND i.google_email = $2 AND i.expires_at > NOW()
            AND f.farmer_id = i.farmer_id AND f.status = 'active'
          RETURNING i.farmer_id
        )
        INSERT INTO farmer_google_identities (google_subject, farmer_id)
        SELECT $3, farmer_id FROM redeemed
        RETURNING farmer_id
      `, [inviteHash, identity.email.toLowerCase(), identity.sub]);
      farmerId = result.rows[0]?.farmer_id;
    } else {
      const result = await db.query(`
        SELECT f.farmer_id FROM farmer_google_identities g
        JOIN farmers f ON f.farmer_id = g.farmer_id
        WHERE g.google_subject = $1 AND f.status = 'active'
      `, [identity.sub]);
      farmerId = result.rows[0]?.farmer_id;
    }

    if (!farmerId) return res.redirect('/pilot-login?google=failed');
    const sessionToken = createSessionToken();
    await authRepository.createSession({
      sessionId: crypto.randomUUID(),
      farmerId,
      tokenHash: hashSessionToken(sessionToken),
      expiresAt: Math.floor(Date.now() / 1000) + sessionLifetimeSeconds(),
    });
    setSessionCookie(res, sessionToken, req);
    return res.redirect('/pilot-login');
  } catch {
    return res.redirect('/pilot-login?google=failed');
  }
});

export { router as googleAuthRouter };
