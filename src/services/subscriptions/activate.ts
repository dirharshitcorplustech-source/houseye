/**
 * HOUSEYE.COM — Activate / change subscription
 *
 * Production: payment verified via webhook before activation.
 * This service is the authoritative activation after verification.
 *
 * For local/dev: supports direct activate when ALLOW_DEV_SUBSCRIPTION=true
 * or when paymentRef is provided as verified.
 */

import mongoose from 'mongoose';
import { connectDB } from '@/lib/db/connect';
import { Account, SubscriptionInvoice } from '@/models';
import { CurrentUser } from '@/lib/auth/get-session';
import { isOwner, isSuperAdmin } from '@/services/authorization';
import {
  PLAN_LIMITS,
  PLAN_PRICING,
  PLAN_NAMES,
  ADDON_PRICING,
} from '@/constants/plans';
import { PlanId } from '@/types';
import { nanoid } from 'nanoid';
import { allowDevSubscription } from '@/lib/config/env';
import { writeAuditLog } from '@/services/audit/write';

export interface ActivateSubscriptionInput {
  planId: PlanId;
  cycle: 'monthly' | 'annual';
  addOns?: {
    extraUnits?: number;
    extraAdmins?: number;
    extraManagers?: number;
    extraStorageGB?: number;
    extraNotifications?: number;
  };
  /** Must be verified payment reference in production */
  paymentRef?: string;
  /** Dev-only bypass */
  devMode?: boolean;
  taxRate?: number; // e.g. 0.18 for 18% GST
}

function invoiceNumber(): string {
  const d = new Date();
  return `INV-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-${nanoid(8).toUpperCase()}`;
}

export async function activateSubscription(
  actor: CurrentUser,
  input: ActivateSubscriptionInput
): Promise<
  | {
      success: true;
      subscription: Record<string, unknown>;
      invoice: Record<string, unknown>;
    }
  | { success: false; code: string; message: string }
> {
  if (!isOwner(actor) && !isSuperAdmin(actor)) {
    return {
      success: false,
      code: 'FORBIDDEN',
      message: 'Only the Owner can manage subscription',
    };
  }

  if (!actor.accountId) {
    return { success: false, code: 'FORBIDDEN', message: 'No account context' };
  }

  if (!PLAN_LIMITS[input.planId]) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Invalid plan',
    };
  }

  // Production/staging: NEVER allow activate without verified paymentRef
  const allowDev = allowDevSubscription();

  if (!input.paymentRef && !allowDev) {
    return {
      success: false,
      code: 'PAYMENT_REQUIRED',
      message: 'Subscription payment must be verified before activation',
    };
  }

  await connectDB();

  const account = await Account.findById(actor.accountId).exec();
  if (!account) {
    return { success: false, code: 'NOT_FOUND', message: 'Account not found' };
  }

  if (account.deactivatedAt || account.deletionRequestedAt) {
    // Deletion pending keeps read-only even if they try to renew (spec nuance)
    if (account.deletionRequestedAt && !account.deactivatedAt) {
      // Spec: renew while deletion pending → subscription active BUT account stays read-only
      // We still allow activation of subscription record
    }
  }

  const pricing = PLAN_PRICING[input.planId];
  const baseAmount =
    input.cycle === 'annual' ? pricing.annual : pricing.monthly;

  const addOns = {
    extraUnits: input.addOns?.extraUnits || 0,
    extraAdmins: input.addOns?.extraAdmins || 0,
    extraManagers: input.addOns?.extraManagers || 0,
    extraStorageGB: input.addOns?.extraStorageGB || 0,
    extraNotifications: input.addOns?.extraNotifications || 0,
  };

  // Addon pricing is monthly; for annual multiply by 12 for simplicity in MVP
  const months = input.cycle === 'annual' ? 12 : 1;
  const addonAmount =
    (addOns.extraUnits * ADDON_PRICING.extraUnit +
      addOns.extraAdmins * ADDON_PRICING.extraAdmin +
      addOns.extraManagers * ADDON_PRICING.extraManager +
      Math.ceil(addOns.extraStorageGB / 5) * ADDON_PRICING.extraStorage5GB +
      Math.ceil(addOns.extraNotifications / 100) *
        ADDON_PRICING.extraNotifications100) *
    months;

  const subtotal = baseAmount + addonAmount;
  const taxRate = input.taxRate ?? 0; // configurable; not hardcoded immutable
  const taxAmount = Math.round(subtotal * taxRate);
  const total = subtotal + taxAmount;

  const now = new Date();
  const end = new Date(now);
  if (input.cycle === 'annual') {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setMonth(end.getMonth() + 1);
  }

  const lines = [
    {
      description: `${PLAN_NAMES[input.planId]} plan (${input.cycle})`,
      amount: baseAmount,
      quantity: 1,
    },
  ];
  if (addOns.extraUnits) {
    lines.push({
      description: `Extra units × ${addOns.extraUnits}`,
      amount: addOns.extraUnits * ADDON_PRICING.extraUnit * months,
      quantity: addOns.extraUnits,
    });
  }
  if (addOns.extraAdmins) {
    lines.push({
      description: `Extra admins × ${addOns.extraAdmins}`,
      amount: addOns.extraAdmins * ADDON_PRICING.extraAdmin * months,
      quantity: addOns.extraAdmins,
    });
  }
  if (addOns.extraManagers) {
    lines.push({
      description: `Extra managers × ${addOns.extraManagers}`,
      amount: addOns.extraManagers * ADDON_PRICING.extraManager * months,
      quantity: addOns.extraManagers,
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    account.subscriptionStatus = 'ACTIVE';
    account.planId = input.planId;
    account.subscriptionStartAt = now;
    account.subscriptionEndAt = end;
    account.autoRenew = account.autoRenew !== false;
    account.cancelledAt = undefined;
    account.addOns = addOns;
    await account.save({ session });

    const [invoice] = await SubscriptionInvoice.create(
      [
        {
          accountId: account._id,
          invoiceNumber: invoiceNumber(),
          status: 'PAID',
          planId: input.planId,
          billingPeriodStart: now,
          billingPeriodEnd: end,
          lines,
          subtotal,
          taxAmount,
          taxRate,
          total,
          billingSnapshot: {
            name: account.name,
            organizationName: account.organizationName,
            pan: account.pan,
            gstin: account.gstin,
            email: account.billingEmail,
            mobile: account.billingMobile,
            address: account.billingAddress
              ? [
                  account.billingAddress.line1,
                  account.billingAddress.city,
                  account.billingAddress.state,
                  account.billingAddress.pin,
                ]
                  .filter(Boolean)
                  .join(', ')
              : undefined,
          },
          paidAt: now,
          paymentRef: input.paymentRef || (allowDev ? 'DEV_ACTIVATE' : undefined),
        },
      ],
      { session }
    );

    await session.commitTransaction();

    await writeAuditLog({
      accountId: account._id.toString(),
      actorUserId: actor.id,
      actorRole: actor.role,
      action: 'subscription.activated',
      entityType: 'Account',
      entityId: account._id.toString(),
      metadata: { planId: input.planId, cycle: input.cycle },
    });

    return {
      success: true,
      subscription: {
        status: account.subscriptionStatus,
        planId: account.planId,
        startAt: account.subscriptionStartAt,
        endAt: account.subscriptionEndAt,
        addOns: account.addOns,
        limits: {
          ...PLAN_LIMITS[input.planId],
          units: PLAN_LIMITS[input.planId].units + addOns.extraUnits,
          admins: PLAN_LIMITS[input.planId].admins + addOns.extraAdmins,
          managers: PLAN_LIMITS[input.planId].managers + addOns.extraManagers,
        },
      },
      invoice: {
        id: invoice._id.toString(),
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
        status: invoice.status,
      },
    };
  } catch (err) {
    await session.abortTransaction();
    console.error('[Houseye] activateSubscription:', err);
    return {
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to activate subscription',
    };
  } finally {
    session.endSession();
  }
}
