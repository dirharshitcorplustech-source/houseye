/**
 * HOUSEYE.COM — Encrypt secrets at rest (Owner gateway keys)
 * Requires GATEWAY_ENCRYPTION_KEY (32-byte hex or utf8 padded)
 */

import crypto from 'crypto';

function getKey(): Buffer {
  const raw =
    process.env.GATEWAY_ENCRYPTION_KEY ||
    process.env.AUTH_SECRET ||
    'dev-only-gateway-key-change-me!!';
  // Derive 32-byte key
  return crypto.createHash('sha256').update(raw).digest();
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

export function decryptSecret(payload: string): string {
  const parts = payload.split(':');
  if (parts.length !== 4 || parts[0] !== 'v1') {
    throw new Error('Invalid encrypted payload');
  }
  const iv = Buffer.from(parts[1], 'base64');
  const tag = Buffer.from(parts[2], 'base64');
  const data = Buffer.from(parts[3], 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

export function maskSecret(plainOrMasked: string): string {
  if (!plainOrMasked || plainOrMasked.length < 6) return '••••••';
  return `${plainOrMasked.slice(0, 4)}••••${plainOrMasked.slice(-2)}`;
}
