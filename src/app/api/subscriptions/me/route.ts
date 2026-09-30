/**
 * HOUSEYE.COM — GET current subscription + usage + limits
 */

import { getCurrentUser } from '@/lib/auth/get-session';
import { connectDB } from '@/lib/db/connect';
import { Account } from '@/models';
import { getEffectiveLimits, getUsage } from '@/services/entitlement';
import { successResponse, Errors } from '@/lib/utils/response';
import { PLAN_PRICING, PLAN_NAMES } from '@/constants/plans';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();
    if (!user.accountId) return Errors.forbidden();

    await connectDB();
    const account = await Account.findById(user.accountId).lean();
    if (!account) return Errors.notFound('Account not found');

    const limits = await getEffectiveLimits(user.accountId);
    const usage = await getUsage(user.accountId);

    return successResponse({
      status: account.subscriptionStatus,
      planId: account.planId,
      planName: account.planId
        ? PLAN_NAMES[account.planId as keyof typeof PLAN_NAMES]
        : null,
      startAt: account.subscriptionStartAt,
      endAt: account.subscriptionEndAt,
      autoRenew: account.autoRenew,
      cancelledAt: account.cancelledAt,
      addOns: account.addOns,
      pricing: account.planId
        ? PLAN_PRICING[account.planId as keyof typeof PLAN_PRICING]
        : null,
      limits,
      usage,
    });
  } catch (err) {
    console.error('[Houseye] GET subscription:', err);
    return Errors.server();
  }
}
