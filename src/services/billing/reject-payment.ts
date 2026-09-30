/**
 * HOUSEYE.COM — Reject payment
 * Rejection reason is mandatory.
 * Bill remains unchanged.
 */

import { connectDB } from '@/lib/db/connect';
import { Payment } from '@/models';
import { CurrentUser } from '@/lib/auth/get-session';
import {
  isOwner,
  isSuperAdmin,
  hasPermission,
  requireActiveSubscription,
} from '@/services/authorization';
import { PERMISSIONS } from '@/constants/permissions';
import mongoose from 'mongoose';
import { notifyPaymentEvent } from '@/services/notifications/dispatch';
import { NOTIFICATION_TYPES } from '@/constants/notifications';
import { writeAuditLog } from '@/services/audit/write';

export async function rejectPayment(
  actor: CurrentUser,
  paymentId: string,
  rejectionReason: string
): Promise<
  | { success: true; payment: Record<string, unknown> }
  | { success: false; code: string; message: string }
> {
  const canReject =
    isOwner(actor) ||
    isSuperAdmin(actor) ||
    hasPermission(actor, PERMISSIONS.PAYMENT_REJECT);

  if (!canReject) {
    return {
      success: false,
      code: 'FORBIDDEN',
      message: "You don't have permission to reject payments",
    };
  }

  if (!isSuperAdmin(actor)) {
    const sub = requireActiveSubscription(actor);
    if (!sub.allowed) {
      return { success: false, code: sub.code, message: sub.message };
    }
  }

  const reason = rejectionReason?.trim();
  if (!reason) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Rejection reason is required',
    };
  }

  await connectDB();

  const payment = await Payment.findById(paymentId).exec();
  if (!payment) {
    return { success: false, code: 'NOT_FOUND', message: 'Payment not found' };
  }

  if (
    !isSuperAdmin(actor) &&
    payment.accountId.toString() !== actor.accountId
  ) {
    return { success: false, code: 'FORBIDDEN', message: 'Access denied' };
  }

  if (payment.status !== 'SUBMITTED' && payment.status !== 'PENDING') {
    return {
      success: false,
      code: 'CONFLICT',
      message: `Payment is already ${payment.status}`,
    };
  }

  payment.status = 'REJECTED';
  payment.rejectionReason = reason;
  payment.reviewedBy = new mongoose.Types.ObjectId(actor.id);
  payment.reviewedAt = new Date();
  await payment.save();

  // Bill unchanged — no allocation

  await writeAuditLog({
    accountId: payment.accountId.toString(),
    actorUserId: actor.id,
    actorRole: actor.role,
    action: 'payment.rejected',
    entityType: 'Payment',
    entityId: payment._id.toString(),
    metadata: { amount: payment.amount, reason },
  });

  try {
    await notifyPaymentEvent({
      accountId: payment.accountId.toString(),
      type: NOTIFICATION_TYPES.PAYMENT_REJECTED,
      message: `Your payment of ₹${payment.amount} was rejected. Reason: ${reason}`,
      tenantUserId: payment.tenantUserId?.toString(),
      propertyId: payment.propertyId.toString(),
    });
  } catch (e) {
    console.error('[Houseye] notify reject failed', e);
  }

  return {
    success: true,
    payment: {
      id: payment._id.toString(),
      status: payment.status,
      rejectionReason: payment.rejectionReason,
    },
  };
}
