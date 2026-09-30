/**
 * HOUSEYE.COM — Change password while logged in
 * Invalidates ALL sessions (including current) — require re-login
 */

import { connectDB } from '@/lib/db/connect';
import { User, Session } from '@/models';
import {
  hashPassword,
  verifyPassword,
  validatePasswordPolicy,
} from '@/lib/auth/password';
import { CurrentUser } from '@/lib/auth/get-session';

export async function changePassword(
  actor: CurrentUser,
  currentPassword: string,
  newPassword: string
): Promise<
  | { success: true; message: string }
  | { success: false; code: string; message: string; details?: string[] }
> {
  const check = validatePasswordPolicy(newPassword);
  if (!check.valid) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Password does not meet requirements',
      details: check.errors,
    };
  }

  await connectDB();

  const user = await User.findById(actor.id)
    .select('+passwordHash +previousPasswordHash')
    .exec();

  if (!user) {
    return { success: false, code: 'NOT_FOUND', message: 'User not found' };
  }

  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) {
    return {
      success: false,
      code: 'INVALID_PASSWORD',
      message: 'Current password is incorrect',
    };
  }

  if (user.previousPasswordHash) {
    const samePrev = await verifyPassword(
      newPassword,
      user.previousPasswordHash
    );
    if (samePrev) {
      return {
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Cannot reuse your immediately previous password',
      };
    }
  }

  // Also block if same as current
  const sameCurrent = await verifyPassword(newPassword, user.passwordHash);
  if (sameCurrent) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'New password must be different from current password',
    };
  }

  user.previousPasswordHash = user.passwordHash;
  user.passwordHash = await hashPassword(newPassword);
  user.passwordChangedAt = new Date();
  await user.save();

  // Invalidate ALL sessions — must re-login
  await Session.deleteMany({ userId: user._id });

  return {
    success: true,
    message: 'Password changed. Please log in again on all devices.',
  };
}
