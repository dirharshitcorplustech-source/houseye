/**
 * HOUSEYE.COM — Move-out workflow
 * Allowed even when subscription is expired (explicit exception)
 * - Tenancy → MOVED_OUT
 * - Unit → VACANT
 * - Tenant login disabled
 * - Sessions revoked
 * - primaryTenant usage decremented
 * - Historical records retained
 */

import mongoose from 'mongoose';
import { connectDB } from '@/lib/db/connect';
import { Tenancy, Unit, User, Session, Account } from '@/models';
import { CurrentUser } from '@/lib/auth/get-session';
import {
  isOwner,
  isSuperAdmin,
  hasPermission,
  hasPropertyScope,
} from '@/services/authorization';
import { PERMISSIONS } from '@/constants/permissions';
import { writeAuditLog } from '@/services/audit/write';

export interface MoveOutInput {
  tenancyId: string;
  moveOutDate?: string;
  remarks?: string;
  securityDepositSettlementAmount?: number;
}

export async function moveOutTenant(
  actor: CurrentUser,
  input: MoveOutInput
): Promise<
  | { success: true; tenancy: Record<string, unknown> }
  | { success: false; code: string; message: string }
> {
  if (!actor.accountId && !isSuperAdmin(actor)) {
    return { success: false, code: 'FORBIDDEN', message: 'No account context' };
  }

  const canMoveOut =
    isOwner(actor) ||
    isSuperAdmin(actor) ||
    hasPermission(actor, PERMISSIONS.TENANT_MOVE_OUT);

  if (!canMoveOut) {
    return {
      success: false,
      code: 'FORBIDDEN',
      message: "You don't have permission to perform move-out",
    };
  }

  await connectDB();

  const tenancy = await Tenancy.findById(input.tenancyId).exec();
  if (!tenancy) {
    return { success: false, code: 'NOT_FOUND', message: 'Tenancy not found' };
  }

  if (
    !isSuperAdmin(actor) &&
    tenancy.accountId.toString() !== actor.accountId
  ) {
    return { success: false, code: 'FORBIDDEN', message: 'Access denied' };
  }

  if (!isOwner(actor) && !isSuperAdmin(actor)) {
    const scope = hasPropertyScope(actor, tenancy.propertyId.toString());
    if (!scope.allowed) {
      return { success: false, code: scope.code, message: scope.message };
    }
  }

  if (tenancy.status === 'MOVED_OUT') {
    return {
      success: false,
      code: 'CONFLICT',
      message: 'Tenant has already moved out',
    };
  }

  if (tenancy.status !== 'ACTIVE' && tenancy.status !== 'NOTICE') {
    return {
      success: false,
      code: 'CONFLICT',
      message: `Cannot move out tenancy in status ${tenancy.status}`,
    };
  }

  const moveOutDate = input.moveOutDate
    ? new Date(input.moveOutDate)
    : new Date();

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    tenancy.status = 'MOVED_OUT';
    tenancy.moveOutDate = moveOutDate;
    tenancy.endDate = moveOutDate;
    tenancy.moveOutRemarks = input.remarks;
    if (input.securityDepositSettlementAmount !== undefined) {
      tenancy.securityDepositSettlementAmount =
        input.securityDepositSettlementAmount;
      tenancy.securityDepositSettled = true;
    }
    await tenancy.save({ session });

    // Unit vacant
    await Unit.updateOne(
      { _id: tenancy.unitId },
      {
        vacancyStatus: 'VACANT',
        vacancyStartDate: moveOutDate,
        currentResidentCount: 0,
      },
      { session }
    );

    // Disable tenant user
    if (tenancy.primaryTenantUserId) {
      await User.updateOne(
        { _id: tenancy.primaryTenantUserId },
        {
          status: 'DEACTIVATED',
          // keep tenancyId for history
        },
        { session }
      );

      // Revoke all sessions
      await Session.deleteMany(
        { userId: tenancy.primaryTenantUserId },
        { session }
      );
    }

    // Decrement primary tenant usage (not below 0)
    await Account.updateOne(
      {
        _id: tenancy.accountId,
        'usage.primaryTenants': { $gte: 1 },
      },
      { $inc: { 'usage.primaryTenants': -1 } },
      { session }
    );

    await session.commitTransaction();

    await writeAuditLog({
      accountId: tenancy.accountId.toString(),
      actorUserId: actor.id,
      actorRole: actor.role,
      action: 'tenancy.move_out',
      entityType: 'Tenancy',
      entityId: tenancy._id.toString(),
    });

    return {
      success: true,
      tenancy: {
        id: tenancy._id.toString(),
        status: tenancy.status,
        moveOutDate: tenancy.moveOutDate,
        unitId: tenancy.unitId.toString(),
      },
    };
  } catch (err) {
    await session.abortTransaction();
    console.error('[Houseye] moveOut error:', err);
    return {
      success: false,
      code: 'SERVER_ERROR',
      message: 'Move-out failed',
    };
  } finally {
    session.endSession();
  }
}
