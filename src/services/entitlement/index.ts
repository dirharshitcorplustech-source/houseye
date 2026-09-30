/**
 * HOUSEYE.COM — Central Entitlement Service
 * Plan limits + add-ons. Never trust client for remaining capacity.
 */

import { connectDB } from '@/lib/db/connect';
import { Account } from '@/models';
import { PLAN_LIMITS } from '@/constants/plans';
import { PlanId, PlanLimits } from '@/types';

export interface EffectiveLimits extends PlanLimits {
  planId: PlanId | null;
  status: string;
}

export interface UsageSnapshot {
  properties: number;
  units: number;
  primaryTenants: number;
  admins: number;
  managers: number;
  storageBytes: number;
  externalNotificationsUsed: number;
}

export async function getEffectiveLimits(
  accountId: string
): Promise<EffectiveLimits | null> {
  await connectDB();
  const account = await Account.findById(accountId).exec();
  if (!account) return null;

  if (
    account.subscriptionStatus !== 'ACTIVE' ||
    !account.planId
  ) {
    // Explore / expired: no operational entitlement
    return {
      planId: account.planId || null,
      status: account.subscriptionStatus,
      properties: 0,
      units: 0,
      primaryTenants: 0,
      admins: 0,
      managers: 0,
      storageGB: 0,
      externalNotifications: 0,
    };
  }

  const base = PLAN_LIMITS[account.planId as PlanId];
  const addOns = account.addOns || {
    extraUnits: 0,
    extraAdmins: 0,
    extraManagers: 0,
    extraStorageGB: 0,
    extraNotifications: 0,
  };

  return {
    planId: account.planId as PlanId,
    status: account.subscriptionStatus,
    properties: base.properties,
    units: base.units + (addOns.extraUnits || 0),
    primaryTenants: base.primaryTenants + (addOns.extraUnits || 0), // tied to unit capacity conceptually
    admins: base.admins + (addOns.extraAdmins || 0),
    managers: base.managers + (addOns.extraManagers || 0),
    storageGB: base.storageGB + (addOns.extraStorageGB || 0),
    externalNotifications:
      base.externalNotifications + (addOns.extraNotifications || 0),
  };
}

export async function getUsage(accountId: string): Promise<UsageSnapshot | null> {
  await connectDB();
  const account = await Account.findById(accountId).select('usage').exec();
  if (!account) return null;
  return account.usage as UsageSnapshot;
}

export type ResourceKey =
  | 'properties'
  | 'units'
  | 'primaryTenants'
  | 'admins'
  | 'managers';

/**
 * Check if account can consume +1 of a resource.
 * Returns remaining after hypothetical consume, or error.
 */
export async function canConsume(
  accountId: string,
  resource: ResourceKey,
  count = 1
): Promise<
  | { ok: true; limit: number; used: number; remaining: number }
  | { ok: false; code: string; message: string; limit: number; used: number }
> {
  const limits = await getEffectiveLimits(accountId);
  const usage = await getUsage(accountId);

  if (!limits || !usage) {
    return {
      ok: false,
      code: 'ACCOUNT_NOT_FOUND',
      message: 'Account not found',
      limit: 0,
      used: 0,
    };
  }

  if (limits.status !== 'ACTIVE') {
    return {
      ok: false,
      code: 'SUBSCRIPTION_INACTIVE',
      message:
        limits.status === 'EXPLORE'
          ? 'This action requires an active subscription. Choose a plan to continue.'
          : 'Your subscription is inactive. Activate your plan to perform this action.',
      limit: 0,
      used: usage[resource] || 0,
    };
  }

  const limitMap: Record<ResourceKey, number> = {
    properties: limits.properties,
    units: limits.units,
    primaryTenants: limits.primaryTenants,
    admins: limits.admins,
    managers: limits.managers,
  };

  const limit = limitMap[resource];
  const used = usage[resource] || 0;

  if (used + count > limit) {
    return {
      ok: false,
      code: 'RESOURCE_LIMIT',
      message: `Your current plan has reached its ${resource} limit (${used}/${limit}). Add capacity or upgrade your plan.`,
      limit,
      used,
    };
  }

  return {
    ok: true,
    limit,
    used,
    remaining: limit - used - count,
  };
}

/**
 * Atomically increment usage counter (call inside transaction when possible)
 */
export async function incrementUsage(
  accountId: string,
  resource: ResourceKey,
  count = 1
): Promise<void> {
  await connectDB();
  const field = `usage.${resource}`;
  await Account.updateOne(
    { _id: accountId },
    { $inc: { [field]: count } }
  ).exec();
}

export async function decrementUsage(
  accountId: string,
  resource: ResourceKey,
  count = 1
): Promise<void> {
  await connectDB();
  const field = `usage.${resource}`;
  await Account.updateOne(
    { _id: accountId, [field]: { $gte: count } },
    { $inc: { [field]: -count } }
  ).exec();
}
