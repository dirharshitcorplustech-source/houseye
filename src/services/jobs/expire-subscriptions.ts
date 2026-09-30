/**
 * HOUSEYE.COM — Expire subscriptions past end date (when auto-renew off or unpaid)
 * Does NOT delete data — only flips status to EXPIRED.
 */

import { connectDB } from '@/lib/db/connect';
import { Account } from '@/models';
import { writeAuditLog } from '@/services/audit/write';

export async function expireSubscriptions(limit = 100): Promise<{
  expired: number;
  accountIds: string[];
}> {
  await connectDB();
  const now = new Date();

  const accounts = await Account.find({
    subscriptionStatus: 'ACTIVE',
    subscriptionEndAt: { $lt: now },
    deactivatedAt: null,
  })
    .limit(limit)
    .exec();

  const accountIds: string[] = [];

  for (const account of accounts) {
    // If autoRenew is true, production would attempt charge first.
    // Without gateway: expire; renew path is Owner-activated.
    account.subscriptionStatus = 'EXPIRED';
    await account.save();
    accountIds.push(account._id.toString());

    await writeAuditLog({
      accountId: account._id.toString(),
      action: 'subscription.expired',
      entityType: 'Account',
      entityId: account._id.toString(),
      metadata: {
        endAt: account.subscriptionEndAt,
        autoRenew: account.autoRenew,
      },
    });
  }

  return { expired: accountIds.length, accountIds };
}
