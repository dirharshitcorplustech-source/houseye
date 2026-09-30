/**
 * HOUSEYE.COM — Super Admin customer list & details
 */

import { connectDB } from '@/lib/db/connect';
import { Account, User, Property, Unit, Tenancy } from '@/models';
import { PLAN_NAMES } from '@/constants/plans';
import { PlanId } from '@/types';

export async function listCustomers(params?: {
  status?: string;
  search?: string;
  limit?: number;
  skip?: number;
}) {
  await connectDB();

  const filter: Record<string, unknown> = {};
  if (params?.status === 'active') {
    filter.subscriptionStatus = 'ACTIVE';
    filter.deactivatedAt = null;
  } else if (params?.status === 'expired') {
    filter.subscriptionStatus = { $in: ['EXPIRED', 'CANCELLED'] };
  } else if (params?.status === 'suspended') {
    filter.isSuspended = true;
  } else if (params?.status === 'deleted') {
    filter.deactivatedAt = { $ne: null };
  }

  if (params?.search) {
    filter.$or = [
      { name: { $regex: params.search, $options: 'i' } },
      { organizationName: { $regex: params.search, $options: 'i' } },
      { billingEmail: { $regex: params.search, $options: 'i' } },
    ];
  }

  const limit = Math.min(params?.limit || 50, 100);
  const skip = params?.skip || 0;

  const [accounts, total] = await Promise.all([
    Account.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Account.countDocuments(filter),
  ]);

  const accountIds = accounts.map((a) => a._id);

  const owners = await User.find({
    accountId: { $in: accountIds },
    role: 'OWNER',
  })
    .select('accountId fullName username email lastLoginAt status')
    .lean();

  const ownerByAccount = Object.fromEntries(
    owners.map((o) => [o.accountId?.toString(), o])
  );

  const customers = accounts.map((a) => {
    const owner = ownerByAccount[a._id.toString()];
    return {
      id: a._id.toString(),
      name: a.name,
      organizationName: a.organizationName,
      accountType: a.accountType,
      planId: a.planId,
      planName: a.planId
        ? PLAN_NAMES[a.planId as PlanId] || a.planId
        : null,
      subscriptionStatus: a.subscriptionStatus,
      subscriptionEndAt: a.subscriptionEndAt,
      isSuspended: a.isSuspended,
      deactivatedAt: a.deactivatedAt,
      deletionRequestedAt: a.deletionRequestedAt,
      usage: a.usage,
      owner: owner
        ? {
            fullName: owner.fullName,
            username: owner.username,
            email: owner.email,
            lastLoginAt: owner.lastLoginAt,
            status: owner.status,
          }
        : null,
      createdAt: a.createdAt,
    };
  });

  return { customers, total, limit, skip };
}

export async function getCustomerDetail(accountId: string) {
  await connectDB();

  const account = await Account.findById(accountId).lean();
  if (!account) return null;

  const [owner, admins, managers, propertyCount, unitCount, activeTenants] =
    await Promise.all([
      User.findOne({ accountId, role: 'OWNER' })
        .select('fullName username email mobile status lastLoginAt')
        .lean(),
      User.find({ accountId, role: 'ADMIN', status: { $ne: 'REMOVED' } })
        .select('fullName username status')
        .lean(),
      User.find({ accountId, role: 'MANAGER', status: { $ne: 'REMOVED' } })
        .select('fullName username status propertyScopes')
        .lean(),
      Property.countDocuments({ accountId, deletedAt: null }),
      Unit.countDocuments({ accountId, deletedAt: null }),
      Tenancy.countDocuments({ accountId, status: 'ACTIVE' }),
    ]);

  return {
    account: {
      id: account._id.toString(),
      name: account.name,
      organizationName: account.organizationName,
      accountType: account.accountType,
      planId: account.planId,
      subscriptionStatus: account.subscriptionStatus,
      subscriptionStartAt: account.subscriptionStartAt,
      subscriptionEndAt: account.subscriptionEndAt,
      autoRenew: account.autoRenew,
      addOns: account.addOns,
      usage: account.usage,
      isSuspended: account.isSuspended,
      suspensionReason: account.suspensionReason,
      deletionRequestedAt: account.deletionRequestedAt,
      deletionReason: account.deletionReason,
      deactivatedAt: account.deactivatedAt,
      billingEmail: account.billingEmail,
      gstin: account.gstin,
      pan: account.pan,
      createdAt: account.createdAt,
    },
    owner,
    admins: admins.map((a) => ({
      id: a._id.toString(),
      fullName: a.fullName,
      username: a.username,
      status: a.status,
    })),
    managers: managers.map((m) => ({
      id: m._id.toString(),
      fullName: m.fullName,
      username: m.username,
      status: m.status,
    })),
    counts: {
      properties: propertyCount,
      units: unitCount,
      activeTenants,
      admins: admins.length,
      managers: managers.length,
    },
  };
}

export async function suspendCustomer(
  accountId: string,
  reason: string,
  suspendedBy: string
) {
  await connectDB();
  const account = await Account.findById(accountId).exec();
  if (!account) return { success: false as const, message: 'Not found' };

  account.isSuspended = true;
  account.suspensionReason = reason;
  account.suspendedAt = new Date();
  account.suspendedBy = suspendedBy as unknown as import('mongoose').Types.ObjectId;
  await account.save();

  // Block non-owner logins
  await User.updateMany(
    { accountId, role: { $in: ['ADMIN', 'MANAGER', 'TENANT'] } },
    { status: 'SUSPENDED' }
  );

  return { success: true as const };
}

export async function unsuspendCustomer(accountId: string) {
  await connectDB();
  const account = await Account.findById(accountId).exec();
  if (!account) return { success: false as const, message: 'Not found' };

  account.isSuspended = false;
  account.suspensionReason = undefined;
  account.suspendedAt = undefined;
  await account.save();

  await User.updateMany(
    { accountId, status: 'SUSPENDED', role: { $in: ['ADMIN', 'MANAGER', 'TENANT'] } },
    { status: 'ACTIVE' }
  );

  return { success: true as const };
}
