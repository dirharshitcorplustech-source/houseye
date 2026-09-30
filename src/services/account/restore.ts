/**
 * HOUSEYE.COM — Account restore request & Super Admin approval
 */

import { connectDB } from '@/lib/db/connect';
import { Account, User, Session } from '@/models';
import { CurrentUser } from '@/lib/auth/get-session';
import { isSuperAdmin } from '@/services/authorization';
import { hashPassword } from '@/lib/auth/password';
import { nanoid } from 'nanoid';

/**
 * Deactivated owner requests restore (from login page flow)
 */
export async function requestAccountRestore(
  username: string,
  reason?: string
): Promise<
  | { success: true; message: string }
  | { success: false; code: string; message: string }
> {
  await connectDB();

  const user = await User.findOne({
    username: username.trim().toUpperCase(),
    role: 'OWNER',
  }).exec();

  if (!user || !user.accountId) {
    return {
      success: false,
      code: 'NOT_FOUND',
      message: 'Account not found',
    };
  }

  const account = await Account.findById(user.accountId).exec();
  if (!account?.deactivatedAt) {
    return {
      success: false,
      code: 'CONFLICT',
      message: 'This account is not in a deleted/deactivated state',
    };
  }

  account.set('restoreRequestedAt', new Date());
  account.set('restoreRequestReason', reason || '');
  await account.save();

  return {
    success: true,
    message:
      'Restore request submitted. Super Admin will review. You cannot withdraw this request.',
  };
}

/**
 * Super Admin approves restore
 * - old sessions revoked
 * - old password invalid → must set new password (we set temp force)
 * - roles/scopes restored (users reactivated)
 * - does NOT auto-renew subscription
 */
export async function approveAccountRestore(
  actor: CurrentUser,
  accountId: string
): Promise<
  | { success: true; message: string }
  | { success: false; code: string; message: string }
> {
  if (!isSuperAdmin(actor)) {
    return { success: false, code: 'FORBIDDEN', message: 'Super Admin only' };
  }

  await connectDB();
  const account = await Account.findById(accountId).exec();
  if (!account) {
    return { success: false, code: 'NOT_FOUND', message: 'Account not found' };
  }

  if (!account.deactivatedAt) {
    return {
      success: false,
      code: 'CONFLICT',
      message: 'Account is not deactivated',
    };
  }

  account.deactivatedAt = undefined;
  account.deletionRequestedAt = undefined;
  account.deletionReason = undefined;
  account.restoredAt = new Date();
  account.set('restoreRequestedAt', undefined);
  // Subscription stays whatever it was (likely EXPIRED) — Owner must renew
  if (account.subscriptionStatus === 'DELETION_PENDING') {
    account.subscriptionStatus = 'EXPIRED';
  }
  await account.save();

  // Reactivate staff + owner
  await User.updateMany(
    { accountId: account._id, status: 'DEACTIVATED' },
    { status: 'ACTIVE' }
  );

  // Invalidate all passwords force re-set: rotate owner password to random
  const owner = await User.findOne({ accountId: account._id, role: 'OWNER' })
    .select('+passwordHash')
    .exec();
  if (owner) {
    owner.passwordHash = await hashPassword(nanoid(32));
    owner.passwordChangedAt = new Date();
    await owner.save();
  }

  // Revoke all sessions
  const users = await User.find({ accountId: account._id }).select('_id').lean();
  await Session.deleteMany({ userId: { $in: users.map((u) => u._id) } });

  return {
    success: true,
    message:
      'Account restored. Owner must reset password on next login. Subscription must be renewed if inactive.',
  };
}
