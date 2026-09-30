/**
 * HOUSEYE.COM — Write audit entry (fire-and-forget safe)
 */

import { connectDB } from '@/lib/db/connect';
import { AuditLog } from '@/models';

export async function writeAuditLog(input: {
  accountId?: string;
  actorUserId?: string;
  actorRole?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}): Promise<void> {
  try {
    await connectDB();
    await AuditLog.create({
      accountId: input.accountId || undefined,
      actorUserId: input.actorUserId || undefined,
      actorRole: input.actorRole,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata,
      ipAddress: input.ipAddress,
    });
  } catch (err) {
    console.error('[Houseye] audit write failed:', err);
  }
}
