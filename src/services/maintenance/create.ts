/**
 * HOUSEYE.COM — Tenant submits maintenance request
 * Blocked when subscription expired (spec).
 */

import { connectDB } from '@/lib/db/connect';
import MaintenanceRequest, {
  determinePriority,
  MAINTENANCE_CATEGORIES,
} from '@/models/MaintenanceRequest';
import { Tenancy, Account } from '@/models';
import { CurrentUser } from '@/lib/auth/get-session';
import { dispatchNotification } from '@/services/notifications/dispatch';
import { NOTIFICATION_TYPES } from '@/constants/notifications';

export interface CreateMaintenanceInput {
  category: string;
  description: string;
  photoFileName?: string;
  /** Staff can create on behalf with tenancyId */
  tenancyId?: string;
}

export async function createMaintenanceRequest(
  actor: CurrentUser,
  input: CreateMaintenanceInput
): Promise<
  | { success: true; request: Record<string, unknown> }
  | { success: false; code: string; message: string }
> {
  const description = input.description?.trim();
  if (!description || description.length < 5) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Please describe the issue (minimum 5 characters)',
    };
  }

  if (!input.category) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Category is required',
    };
  }

  await connectDB();

  let tenancy = null;

  if (actor.role === 'TENANT') {
    tenancy = await Tenancy.findOne({
      primaryTenantUserId: actor.id,
      status: { $in: ['ACTIVE', 'NOTICE'] },
    }).exec();
  } else if (input.tenancyId) {
    tenancy = await Tenancy.findById(input.tenancyId).exec();
    if (
      tenancy &&
      actor.accountId &&
      tenancy.accountId.toString() !== actor.accountId
    ) {
      return { success: false, code: 'FORBIDDEN', message: 'Access denied' };
    }
  }

  if (!tenancy) {
    return {
      success: false,
      code: 'NOT_FOUND',
      message: 'No active tenancy found',
    };
  }

  // Subscription gate — new complaints blocked when expired
  const account = await Account.findById(tenancy.accountId)
    .select('subscriptionStatus')
    .exec();
  if (!account || account.subscriptionStatus !== 'ACTIVE') {
    return {
      success: false,
      code: 'SUBSCRIPTION_INACTIVE',
      message:
        'New maintenance requests are blocked because the subscription is inactive.',
    };
  }

  const priority = determinePriority(input.category);

  const doc = await MaintenanceRequest.create({
    accountId: tenancy.accountId,
    propertyId: tenancy.propertyId,
    unitId: tenancy.unitId,
    tenancyId: tenancy._id,
    tenantUserId: tenancy.primaryTenantUserId,
    category: input.category,
    description,
    photoFileName: input.photoFileName,
    priority,
    status: 'SUBMITTED',
    statusHistory: [
      {
        status: 'SUBMITTED',
        at: new Date(),
        by: actor.id,
      },
    ],
    createdBy: actor.id,
  });

  // Notify (in-app) — owner path simplified: account-level
  try {
    await dispatchNotification({
      accountId: tenancy.accountId.toString(),
      notificationType: NOTIFICATION_TYPES.MAINTENANCE_SUBMITTED,
      message: `New maintenance request: ${input.category} — ${description.slice(0, 80)}`,
      propertyId: tenancy.propertyId.toString(),
      unitId: tenancy.unitId.toString(),
      tenantId: tenancy.primaryTenantUserId?.toString(),
      tenancyId: tenancy._id.toString(),
      channels: ['IN_APP'],
    });
  } catch {
    /* non-blocking */
  }

  return {
    success: true,
    request: {
      id: doc._id.toString(),
      category: doc.category,
      status: doc.status,
      priority: doc.priority,
      createdAt: doc.createdAt,
    },
  };
}
