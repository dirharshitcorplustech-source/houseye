/**
 * HOUSEYE.COM — Cancel subscription = turn off auto-renew
 * Current paid period remains active until end.
 */

import { connectDB } from '@/lib/db/connect';
import { Account } from '@/models';
import { CurrentUser } from '@/lib/auth/get-session';
import { isOwner, isSuperAdmin } from '@/services/authorization';

export async function cancelSubscription(
  actor: CurrentUser
): Promise<
  | { success: true; message: string; endAt?: Date }
  | { success: false; code: string; message: string }
> {
  if (!isOwner(actor) && !isSuperAdmin(actor)) {
    return {
      success: false,
      code: 'FORBIDDEN',
      message: 'Only the Owner can cancel subscription',
    };
  }

  if (!actor.accountId) {
    return { success: false, code: 'FORBIDDEN', message: 'No account context' };
  }

  await connectDB();
  const account = await Account.findById(actor.accountId).exec();
  if (!account) {
    return { success: false, code: 'NOT_FOUND', message: 'Account not found' };
  }

  account.autoRenew = false;
  account.cancelledAt = new Date();
  await account.save();

  return {
    success: true,
    message:
      'Auto-renew turned off. Your plan stays active until the end of the current period.',
    endAt: account.subscriptionEndAt,
  };
}
