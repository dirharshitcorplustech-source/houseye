/**
 * HOUSEYE.COM — Account deletion request (30-day waiting period)
 * No instant permanent delete.
 * Cancel requires Super Admin approval.
 */

import { connectDB } from '@/lib/db/connect';
import { Account, User, Session } from '@/models';
import { CurrentUser } from '@/lib/auth/get-session';
import { isOwner, isSuperAdmin } from '@/services/authorization';

const WAITING_DAYS = 30;

export async function requestAccountDeletion(
  actor: CurrentUser,
  reason: string,
  passwordVerified: boolean
): Promise<
  | { success: true; deletionRequestedAt: Date; endsAt: Date }
  | { success: false; code: string; message: string }
> {
  if (!isOwner(actor)) {
    return {
      success: false,
      code: 'FORBIDDEN',
      message: 'Only the Owner can request account deletion',
    };
  }

  if (!passwordVerified) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Password verification required',
    };
  }

  const reasonTrim = reason?.trim();
  if (!reasonTrim || reasonTrim.length < 5) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'A reason is required (minimum 5 characters)',
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

  if (account.deletionRequestedAt) {
    return {
      success: false,
      code: 'CONFLICT',
      message: 'A deletion request is already pending',
    };
  }

  if (account.deactivatedAt) {
    return {
      success: false,
      code: 'CONFLICT',
      message: 'Account is already deactivated',
    };
  }

  const now = new Date();
  account.deletionRequestedAt = now;
  account.deletionReason = reasonTrim;
  // Keep subscription state; operational access becomes restricted via checks
  await account.save();

  const endsAt = new Date(now);
  endsAt.setDate(endsAt.getDate() + WAITING_DAYS);

  return {
    success: true,
    deletionRequestedAt: now,
    endsAt,
  };
}

/**
 * Owner requests cancellation of deletion — needs Super Admin approval
 */
export async function requestDeletionCancellation(
  actor: CurrentUser
): Promise<
  | { success: true; message: string }
  | { success: false; code: string; message: string }
> {
  if (!isOwner(actor) || !actor.accountId) {
    return { success: false, code: 'FORBIDDEN', message: 'Only Owner can request cancellation' };
  }

  await connectDB();
  const account = await Account.findById(actor.accountId).exec();
  if (!account?.deletionRequestedAt) {
    return {
      success: false,
      code: 'CONFLICT',
      message: 'No pending deletion request',
    };
  }

  // Mark pending cancellation — Super Admin must approve
  // Store on account via suspensionReason field reuse is wrong;
  // use a simple flag in deletionReason prefix or dedicated field
  // For MVP: set a note
  (account as { deletionCancelRequestedAt?: Date }).deletionCancelRequestedAt =
    new Date();
  account.set('deletionCancelRequestedAt', new Date());
  await account.save();

  return {
    success: true,
    message:
      'Cancellation requested. Super Admin must approve before full access is restored.',
  };
}

/**
 * Super Admin approves deletion cancellation
 */
export async function approveDeletionCancellation(
  actor: CurrentUser,
  accountId: string
): Promise<
  | { success: true }
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

  account.deletionRequestedAt = undefined;
  account.deletionReason = undefined;
  account.set('deletionCancelRequestedAt', undefined);
  await account.save();

  return { success: true };
}

/**
 * Job: finalize deletion after 30 days
 */
export async function finalizeAccountDeletion(
  accountId: string
): Promise<
  | { success: true }
  | { success: false; code: string; message: string }
> {
  await connectDB();
  const account = await Account.findById(accountId).exec();
  if (!account?.deletionRequestedAt) {
    return {
      success: false,
      code: 'CONFLICT',
      message: 'No deletion request',
    };
  }

  const endsAt = new Date(account.deletionRequestedAt);
  endsAt.setDate(endsAt.getDate() + WAITING_DAYS);

  if (new Date() < endsAt) {
    return {
      success: false,
      code: 'CONFLICT',
      message: 'Waiting period not complete',
    };
  }

  account.deactivatedAt = new Date();
  account.subscriptionStatus = 'EXPIRED';
  await account.save();

  // Disable all customer logins
  await User.updateMany(
    { accountId: account._id, role: { $ne: 'SUPER_ADMIN' } },
    { status: 'DEACTIVATED' }
  );

  // Revoke sessions
  const users = await User.find({ accountId: account._id }).select('_id').lean();
  const userIds = users.map((u) => u._id);
  await Session.deleteMany({ userId: { $in: userIds } });

  return { success: true };
}

export { WAITING_DAYS };
