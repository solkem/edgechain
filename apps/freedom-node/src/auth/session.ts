import crypto from 'crypto';
import { Request, Response } from 'express';

export const FARMER_SESSION_COOKIE = 'edgechain_farmer_session';
const DEFAULT_SESSION_SECONDS = 12 * 60 * 60;

export function createSessionToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function sessionLifetimeSeconds(): number {
  const configured = Number(process.env.FARMER_SESSION_SECONDS);
  return Number.isFinite(configured) && configured >= 900
    ? Math.floor(configured)
    : DEFAULT_SESSION_SECONDS;
}

export function readSessionToken(req: Request): string | undefined {
  const cookies = parseCookieHeader(req.headers.cookie);
  return cookies[FARMER_SESSION_COOKIE];
}

export function setSessionCookie(res: Response, token: string): void {
  const secure = process.env.NODE_ENV === 'production';
  const attributes = [
    `${FARMER_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    `SameSite=${secure ? 'None' : 'Lax'}`,
    `Max-Age=${sessionLifetimeSeconds()}`,
  ];
  if (secure) attributes.push('Secure');
  res.setHeader('Set-Cookie', attributes.join('; '));
}

export function clearSessionCookie(res: Response): void {
  const secure = process.env.NODE_ENV === 'production';
  const attributes = [
    `${FARMER_SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    `SameSite=${secure ? 'None' : 'Lax'}`,
    'Max-Age=0',
  ];
  if (secure) attributes.push('Secure');
  res.setHeader('Set-Cookie', attributes.join('; '));
}

function parseCookieHeader(header?: string): Record<string, string> {
  if (!header) return {};
  return header.split(';').reduce<Record<string, string>>((cookies, segment) => {
    const separator = segment.indexOf('=');
    if (separator < 0) return cookies;
    const key = segment.slice(0, separator).trim();
    const value = segment.slice(separator + 1).trim();
    if (!key) return cookies;
    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
    return cookies;
  }, {});
}
