/**
 * HOUSEYE.COM — Idempotency helper
 */

import { connectDB } from '@/lib/db/connect';
import { IdempotencyKey } from '@/models';

const DEFAULT_TTL_HOURS = 24;

export async function getIdempotentResponse(
  key: string,
  scope: string
): Promise<{ status: number; body: Record<string, unknown> } | null> {
  if (!key) return null;
  await connectDB();
  const existing = await IdempotencyKey.findOne({ key, scope }).lean();
  if (!existing) return null;
  return {
    status: existing.responseStatus,
    body: existing.responseBody as Record<string, unknown>,
  };
}

export async function saveIdempotentResponse(input: {
  key: string;
  scope: string;
  accountId?: string;
  status: number;
  body: Record<string, unknown>;
  ttlHours?: number;
}): Promise<void> {
  if (!input.key) return;
  await connectDB();
  const expiresAt = new Date(
    Date.now() + (input.ttlHours || DEFAULT_TTL_HOURS) * 60 * 60 * 1000
  );
  try {
    await IdempotencyKey.create({
      key: input.key,
      scope: input.scope,
      accountId: input.accountId,
      responseStatus: input.status,
      responseBody: input.body,
      expiresAt,
    });
  } catch {
    // unique conflict — another request won the race; ignore
  }
}
