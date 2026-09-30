/**
 * HOUSEYE.COM — Audit log list (Owner / Super Admin)
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-session';
import { connectDB } from '@/lib/db/connect';
import { AuditLog } from '@/models';
import { successResponse, Errors } from '@/lib/utils/response';
import { isOwner, isSuperAdmin } from '@/services/authorization';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();

    if (!isOwner(user) && !isSuperAdmin(user)) {
      return Errors.forbidden('Only Owner or Super Admin can view audit logs');
    }

    await connectDB();

    const filter: Record<string, unknown> = {};
    if (!isSuperAdmin(user)) {
      filter.accountId = user.accountId;
    } else {
      const accountId = req.nextUrl.searchParams.get('accountId');
      if (accountId) filter.accountId = accountId;
    }

    const action = req.nextUrl.searchParams.get('action');
    if (action) filter.action = action;

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return successResponse({
      logs: logs.map((l) => ({
        id: l._id.toString(),
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId,
        actorUserId: l.actorUserId?.toString(),
        actorRole: l.actorRole,
        metadata: l.metadata,
        createdAt: l.createdAt,
      })),
    });
  } catch (err) {
    console.error('[Houseye] GET audit:', err);
    return Errors.server();
  }
}
