/**
 * HOUSEYE.COM — Suspend / remove / reactivate Admin or Manager
 * Historical business data retained. Sessions revoked on suspend/remove.
 */

import { connectDB } from '@/lib/db/connect';
import { User, Session } from '@/models';
import { CurrentUser } from '@/lib/auth/get-session';
import {
  isOwner,
  isSuperAdmin,
  hasPermission,
} from '@/services/authorization';
import { PERMISSIONS } from '@/constants/permissions';
import { ROLE_LEVEL } from '@/constants/roles';
import { Role } from '@/types';
import { writeAuditLog } from '@/services/audit/write';

export async function suspendStaff(
  actor: CurrentUser,
  targetUserId: string
): Promise<
  | { success: true }
  | { success: false; code: string; message: string }
> {
  return changeStaffStatus(actor, targetUserId, 'SUSPENDED');
}

export async function removeStaff(
  actor: CurrentUser,
  targetUserId: string
): Promise<
  | { success: true }
  | { success: false; code: string; message: string }
> {
  return changeStaffStatus(actor, targetUserId, 'REMOVED');
}

export async function reactivateStaff(
  actor: CurrentUser,
  targetUserId: string
): Promise<
  | { success: true }
  | { success: false; code: string; message: string }
> {
  return changeStaffStatus(actor, targetUserId, 'ACTIVE');
}

async function changeStaffStatus(
  actor: CurrentUser,
  targetUserId: string,
  newStatus: 'SUSPENDED' | 'REMOVED' | 'ACTIVE'
): Promise<
  | { success: true }
  | { success: false; code: string; message: string }
> {
  await connectDB();

  const target = await User.findById(targetUserId).exec();
  if (!target) {
    return { success: false, code: 'NOT_FOUND', message: 'User not found' };
  }

  if (target.role !== 'ADMIN' && target.role !== 'MANAGER') {
    return {
      success: false,
      code: 'FORBIDDEN',
      message: 'Only Admin or Manager staff can be managed here',
    };
  }

  if (
    !isSuperAdmin(actor) &&
    target.accountId?.toString() !== actor.accountId
  ) {
    return { success: false, code: 'FORBIDDEN', message: 'Access denied' };
  }

  // Admin cannot suspend/remove another Admin merely because same level
  if (target.role === 'ADMIN') {
    if (!isOwner(actor) && !isSuperAdmin(actor)) {
      return {
        success: false,
        code: 'FORBIDDEN',
        message: 'Only the Owner can suspend or remove an Admin',
      };
    }
  } else {
    // Manager
    const can =
      isOwner(actor) ||
      isSuperAdmin(actor) ||
      hasPermission(actor, PERMISSIONS.TEAM_SUSPEND);
    if (!can) {
      return {
        success: false,
        code: 'FORBIDDEN',
        message: "You don't have permission to manage this user",
      };
    }
  }

  // Hierarchy: actor must be higher
  if (
    !isSuperAdmin(actor) &&
    ROLE_LEVEL[actor.role as Role] <= ROLE_LEVEL[target.role as Role]
  ) {
    // Owner is higher than Admin — ROLE_LEVEL Owner 80 > Admin 60
    if (!(isOwner(actor) && target.role === 'ADMIN')) {
      if (ROLE_LEVEL[actor.role as Role] <= ROLE_LEVEL[target.role as Role]) {
        return {
          success: false,
          code: 'FORBIDDEN',
          message: 'Cannot manage a user at the same or higher level',
        };
      }
    }
  }

  const prev = target.status;
  target.status = newStatus;
  if (newStatus === 'SUSPENDED') {
    target.suspendedAt = new Date();
    target.suspendedBy = actor.id as unknown as import('mongoose').Types.ObjectId;
  }
  if (newStatus === 'REMOVED') {
    target.removedAt = new Date();
  }
  await target.save();

  if (newStatus === 'SUSPENDED' || newStatus === 'REMOVED') {
    await Session.deleteMany({ userId: target._id });
  }

  await writeAuditLog({
    accountId: target.accountId?.toString(),
    actorUserId: actor.id,
    action: `staff.${newStatus.toLowerCase()}`,
    entityType: 'User',
    entityId: target._id.toString(),
    metadata: { previousStatus: prev, role: target.role },
  });

  return { success: true };
}
