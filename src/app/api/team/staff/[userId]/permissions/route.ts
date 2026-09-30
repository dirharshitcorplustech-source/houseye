import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-session';
import { connectDB } from '@/lib/db/connect';
import { User } from '@/models';
import { isOwner, isSuperAdmin } from '@/services/authorization';
import { PERMISSIONS } from '@/constants/permissions';
import { successResponse, Errors } from '@/lib/utils/response';
import { writeAuditLog } from '@/services/audit/write';

const ALLOWED = new Set(Object.values(PERMISSIONS));

export async function PUT(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const actor = await getCurrentUser();
    if (!actor) return Errors.unauthorized();
    if (!isOwner(actor) && !isSuperAdmin(actor)) {
      return Errors.forbidden('Only Owner can edit permissions');
    }

    const body = await req.json();
    const permissions: string[] = Array.isArray(body.permissions)
      ? body.permissions.filter((p: string) => ALLOWED.has(p as never))
      : [];

    await connectDB();
    const target = await User.findById(params.userId).exec();
    if (!target) return Errors.notFound?.() || Errors.validation('User not found');

    if (target.role !== 'ADMIN' && target.role !== 'MANAGER') {
      return Errors.forbidden('Only Admin/Manager permissions can be edited');
    }

    if (
      !isSuperAdmin(actor) &&
      target.accountId?.toString() !== actor.accountId
    ) {
      return Errors.forbidden();
    }

    target.permissions = permissions;
    await target.save();

    await writeAuditLog({
      accountId: target.accountId?.toString(),
      actorUserId: actor.id,
      actorRole: actor.role,
      action: 'staff.permissions_updated',
      entityType: 'User',
      entityId: target._id.toString(),
      metadata: { count: permissions.length },
    });

    return successResponse(
      { userId: target._id.toString(), permissions },
      'Permissions updated'
    );
  } catch (err) {
    console.error('[Houseye] permissions:', err);
    return Errors.server();
  }
}
