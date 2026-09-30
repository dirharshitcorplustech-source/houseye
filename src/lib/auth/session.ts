/**
 * HOUSEYE.COM — Session / JWT helpers
 * Using jose for Edge-compatible JWT
 */

import { SignJWT, jwtVerify } from 'jose';
import { nanoid } from 'nanoid';
import { AuthSession, Role } from '@/types';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.AUTH_SECRET || 'dev-secret-change-me'
);

const SESSION_MAX_AGE = Number(process.env.SESSION_MAX_AGE) || 30 * 24 * 60 * 60; // 30 days

export function createSessionId(): string {
  return nanoid(32);
}

export async function createToken(payload: AuthSession): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .setJti(payload.sessionId)
    .sign(JWT_SECRET);
}

export async function verifyToken(
  token: string
): Promise<AuthSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AuthSession;
  } catch {
    return null;
  }
}

export function getSessionCookieOptions(maxAge = SESSION_MAX_AGE) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

export const SESSION_COOKIE_NAME = 'houseye_session';
