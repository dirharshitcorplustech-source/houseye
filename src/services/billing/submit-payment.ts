/**
 * HOUSEYE.COM — Tenant / staff submits payment (manual proof or amount)
 * Does NOT auto-approve. Status = SUBMITTED until Owner/authorized approves.
 */

import { connectDB } from '@/lib/db/connect';
import { Bill, Payment, Tenancy } from '@/models';
import { CurrentUser } from '@/lib/auth/get-session';
import {
  isOwner,
  isSuperAdmin,
  requireActiveSubscription,
} from '@/services/authorization';

export interface SubmitPaymentInput {
  billId: string;
  amount: number;
  method?: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'GATEWAY' | 'OTHER';
  transactionRef?: string;
  paymentDate?: string;
  note?: string;
  proofFileName?: string;
  // proofFileKey after S3 upload — Phase later
}

export async function submitPayment(
  actor: CurrentUser,
  input: SubmitPaymentInput
): Promise<
  | { success: true; payment: Record<string, unknown> }
  | { success: false; code: string; message: string }
> {
  // Subscription must be active for new payments (spec)
  if (!isSuperAdmin(actor)) {
    const sub = requireActiveSubscription(actor);
    // Tenant derives from owner subscription — check via bill account later
    // For tenant role we still block if we can detect; for now check actor status
    if (actor.role !== 'TENANT' && !sub.allowed) {
      return { success: false, code: sub.code, message: sub.message };
    }
  }

  if (!input.amount || input.amount <= 0) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Payment amount must be greater than zero',
    };
  }

  await connectDB();

  const bill = await Bill.findById(input.billId).exec();
  if (!bill) {
    return { success: false, code: 'NOT_FOUND', message: 'Bill not found' };
  }

  // Account isolation
  if (actor.role === 'TENANT') {
    if (bill.tenantUserId?.toString() !== actor.id) {
      return { success: false, code: 'FORBIDDEN', message: 'Access denied' };
    }
  } else if (!isSuperAdmin(actor)) {
    if (bill.accountId.toString() !== actor.accountId) {
      return { success: false, code: 'FORBIDDEN', message: 'Access denied' };
    }
  }

  // Check account subscription for tenant payments path
  if (actor.role === 'TENANT') {
    const { Account } = await import('@/models');
    const account = await Account.findById(bill.accountId)
      .select('subscriptionStatus')
      .exec();
    if (!account || account.subscriptionStatus !== 'ACTIVE') {
      return {
        success: false,
        code: 'SUBSCRIPTION_INACTIVE',
        message:
          'Payments are disabled because the property subscription is inactive.',
      };
    }
  }

  if (bill.status === 'PAID') {
    return {
      success: false,
      code: 'CONFLICT',
      message: 'This bill is already fully paid',
    };
  }

  if (bill.status === 'CANCELLED') {
    return {
      success: false,
      code: 'CONFLICT',
      message: 'Cannot pay a cancelled bill',
    };
  }

  if (!bill.paymentLinkActive) {
    return {
      success: false,
      code: 'CONFLICT',
      message: 'Payment link is inactive',
    };
  }

  const payment = await Payment.create({
    accountId: bill.accountId,
    propertyId: bill.propertyId,
    unitId: bill.unitId,
    tenancyId: bill.tenancyId,
    billId: bill._id,
    tenantUserId: bill.tenantUserId,
    amount: input.amount,
    method: input.method || 'UPI',
    status: 'SUBMITTED',
    transactionRef: input.transactionRef,
    paymentDate: input.paymentDate
      ? new Date(input.paymentDate)
      : new Date(),
    note: input.note,
    proofFileName: input.proofFileName,
    createdBy: actor.id,
  });

  return {
    success: true,
    payment: {
      id: payment._id.toString(),
      amount: payment.amount,
      status: payment.status,
      method: payment.method,
      billId: bill._id.toString(),
      createdAt: payment.createdAt,
    },
  };
}
