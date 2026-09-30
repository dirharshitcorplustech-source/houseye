/**
 * HOUSEYE.COM — Maintenance status lifecycle
 * Frozen when subscription expired.
 * No delete.
 */

import { connectDB } from '@/lib/db/connect';
import MaintenanceRequest from '@/models/MaintenanceRequest';
import { Account } from '@/models';
import { CurrentUser } from '@/lib/auth/get-session';
import {
  isOwner,
  isSuperAdmin,
  hasPermission,
} from '@/services/authorization';
import { PERMISSIONS } from '@/constants/permissions';
import { dispatchNotification } from '@/services/notifications/dispatch';
import { NOTIFICATION_TYPES } from '@/constants/notifications';
import mongoose from 'mongoose';

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  SUBMITTED: ['ACKNOWLEDGED', 'IN_PROGRESS'],
  ACKNOWLEDGED: ['IN_PROGRESS', 'RESOLVED'],
  IN_PROGRESS: ['RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
};

export async function updateMaintenanceStatus(
  actor: CurrentUser,
  requestId: string,
  newStatus: string,
  note?: string
): Promise<
  | { success: true; request: Record<string, unknown> }
  | { success: false; code: string; message: string }
> {
  const canUpdate =
    isOwner(actor) ||
    isSuperAdmin(actor) ||
    hasPermission(actor, PERMISSIONS.MAINTENANCE_UPDATE);

  if (!canUpdate) {
    return {
      success: false,
      code: 'FORBIDDEN',
      message: "You don't have permission to update maintenance",
    };
  }

  await connectDB();

  const doc = await MaintenanceRequest.findById(requestId).exec();
  if (!doc) {
    return { success: false, code: 'NOT_FOUND', message: 'Request not found' };
  }

  if (
    !isSuperAdmin(actor) &&
    doc.accountId.toString() !== actor.accountId
  ) {
    return { success: false, code: 'FORBIDDEN', message: 'Access denied' };
  }

  // Freeze when subscription inactive
  const account = await Account.findById(doc.accountId)
    .select('subscriptionStatus')
    .exec();
  if (!account || account.subscriptionStatus !== 'ACTIVE') {
    return {
      success: false,
      code: 'SUBSCRIPTION_INACTIVE',
      message: 'Maintenance workflow is frozen while subscription is inactive.',
    };
  }

  const allowed = ALLOWED_TRANSITIONS[doc.status] || [];
  if (!allowed.includes(newStatus)) {
    return {
      success: false,
      code: 'CONFLICT',
      message: `Cannot move from ${doc.status} to ${newStatus}`,
    };
  }

  doc.status = newStatus as typeof doc.status;
  doc.statusHistory.push({
    status: newStatus as typeof doc.status,
    at: new Date(),
    by: new mongoose.Types.ObjectId(actor.id),
    note,
  });
  await doc.save();

  if (doc.tenantUserId) {
    try {
      await dispatchNotification({
        accountId: doc.accountId.toString(),
        notificationType: NOTIFICATION_TYPES.MAINTENANCE_STATUS,
        message: `Maintenance request (${doc.category}) is now ${newStatus}`,
        recipientUserId: doc.tenantUserId.toString(),
        propertyId: doc.propertyId.toString(),
        unitId: doc.unitId.toString(),
        channels: ['IN_APP', 'EMAIL'],
      });
    } catch {
      /* non-blocking */
    }
  }

  return {
    success: true,
    request: {
      id: doc._id.toString(),
      status: doc.status,
      priority: doc.priority,
    },
  };
}

export async function setMaintenanceCost(
  actor: CurrentUser,
  requestId: string,
  input: {
    responsibility: 'OWNER' | 'TENANT' | 'SPLIT';
    ownerCost?: number;
    tenantCost?: number;
    finalCost?: number;
  }
): Promise<
  | { success: true }
  | { success: false; code: string; message: string }
> {
  const canDecide =
    isOwner(actor) ||
    isSuperAdmin(actor) ||
    hasPermission(actor, PERMISSIONS.MAINTENANCE_COST_DECIDE);

  if (!canDecide) {
    return {
      success: false,
      code: 'FORBIDDEN',
      message: "You don't have permission to decide maintenance cost",
    };
  }

  await connectDB();
  const doc = await MaintenanceRequest.findById(requestId).exec();
  if (!doc) {
    return { success: false, code: 'NOT_FOUND', message: 'Request not found' };
  }

  if (
    !isSuperAdmin(actor) &&
    doc.accountId.toString() !== actor.accountId
  ) {
    return { success: false, code: 'FORBIDDEN', message: 'Access denied' };
  }

  const account = await Account.findById(doc.accountId)
    .select('subscriptionStatus')
    .exec();
  if (!account || account.subscriptionStatus !== 'ACTIVE') {
    return {
      success: false,
      code: 'SUBSCRIPTION_INACTIVE',
      message: 'Cost updates blocked while subscription is inactive.',
    };
  }

  doc.costResponsibility = input.responsibility;
  doc.ownerCost = input.ownerCost;
  doc.tenantCost = input.tenantCost;
  doc.finalCost = input.finalCost ?? input.tenantCost ?? input.ownerCost;
  doc.costDecidedAt = new Date();
  await doc.save();

  return { success: true };
}

/** Tenant may dispute once */
export async function disputeMaintenanceCost(
  actor: CurrentUser,
  requestId: string,
  reason: string
): Promise<
  | { success: true }
  | { success: false; code: string; message: string }
> {
  if (actor.role !== 'TENANT') {
    return {
      success: false,
      code: 'FORBIDDEN',
      message: 'Only the tenant can dispute cost',
    };
  }

  const reasonTrim = reason?.trim();
  if (!reasonTrim) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Dispute reason is required',
    };
  }

  await connectDB();
  const doc = await MaintenanceRequest.findById(requestId).exec();
  if (!doc) {
    return { success: false, code: 'NOT_FOUND', message: 'Request not found' };
  }

  if (doc.tenantUserId?.toString() !== actor.id) {
    return { success: false, code: 'FORBIDDEN', message: 'Access denied' };
  }

  if (doc.disputed) {
    return {
      success: false,
      code: 'CONFLICT',
      message: 'You have already disputed this request once',
    };
  }

  doc.disputed = true;
  doc.disputeReason = reasonTrim;
  await doc.save();

  return { success: true };
}
