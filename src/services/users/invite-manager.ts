/**
 * HOUSEYE.COM — Invite Manager
 * Owner or Admin (with permission) can invite.
 * Manager does NOT expire invitation automatically.
 */

import { connectDB } from '@/lib/db/connect';
import { User, Account } from '@/models';
import { CurrentUser } from '@/lib/auth/get-session';
import {
  isOwner,
  isSuperAdmin,
  hasPermission,
} from '@/services/authorization';
import { canConsume, incrementUsage } from '@/services/entitlement';
import { generateUsername } from '@/lib/utils/username';
import { PERMISSIONS } from '@/constants/permissions';
import { nanoid } from 'nanoid';
import mongoose from 'mongoose';

export interface InviteManagerInput {
  fullName: string;
  email?: string;
  mobile?: string;
  propertyIds: string[]; // assigned scope
  permissions: string[];
  employeeId?: string;
}

export async function inviteManager(
  actor: CurrentUser,
  input: InviteManagerInput
): Promise<
  | {
      success: true;
      manager: {
        id: string;
        username: string;
        fullName: string;
        status: string;
        invitationToken: string;
      };
    }
  | { success: false; code: string; message: string }
> {
  if (!actor.accountId) {
    return { success: false, code: 'FORBIDDEN', message: 'No account context' };
  }

  const canInvite =
    isOwner(actor) ||
    isSuperAdmin(actor) ||
    hasPermission(actor, PERMISSIONS.TEAM_INVITE_MANAGER);

  if (!canInvite) {
    return {
      success: false,
      code: 'FORBIDDEN',
      message: "You don't have permission to invite managers",
    };
  }

  const fullName = input.fullName?.trim();
  if (!fullName) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Full name is required',
    };
  }

  if (!input.propertyIds || input.propertyIds.length === 0) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'At least one property must be assigned to the manager',
    };
  }

  const entitlement = await canConsume(actor.accountId, 'managers', 1);
  if (!entitlement.ok) {
    return {
      success: false,
      code: entitlement.code,
      message: entitlement.message,
    };
  }

  await connectDB();

  if (input.email) {
    const existing = await User.findOne({
      email: input.email.toLowerCase().trim(),
    }).exec();
    if (existing) {
      return {
        success: false,
        code: 'EMAIL_EXISTS',
        message: 'A user with this email already exists',
      };
    }
  }

  let username = generateUsername('MANAGER', fullName);
  let attempts = 0;
  while (await User.findOne({ username }).exec()) {
    username = generateUsername('MANAGER', fullName);
    attempts++;
    if (attempts > 10) {
      return {
        success: false,
        code: 'USERNAME_GENERATION_FAILED',
        message: 'Could not generate unique username',
      };
    }
  }

  const invitationToken = nanoid(48);

  // Placeholder password hash — manager sets password on accept
  // Using a random unusable hash
  const { hashPassword } = await import('@/lib/auth/password');
  const passwordHash = await hashPassword(nanoid(32));

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const [manager] = await User.create(
      [
        {
          accountId: actor.accountId,
          role: 'MANAGER',
          username,
          email: input.email?.toLowerCase().trim(),
          mobile: input.mobile?.trim(),
          passwordHash,
          fullName,
          status: 'PENDING_INVITATION',
          propertyScopes: input.propertyIds,
          permissions: input.permissions || [],
          invitationToken,
          invitationSentAt: new Date(),
          createdBy: actor.id,
          isEmailVerified: false,
          isMobileVerified: false,
          failedLoginAttempts: 0,
          mfaEnabled: false,
        },
      ],
      { session }
    );

    await Account.updateOne(
      { _id: actor.accountId },
      { $inc: { 'usage.managers': 1 } },
      { session }
    );

    await session.commitTransaction();

    return {
      success: true,
      manager: {
        id: manager._id.toString(),
        username: manager.username,
        fullName: manager.fullName,
        status: manager.status,
        invitationToken, // caller sends via WhatsApp/SMS/Email/Copy link
      },
    };
  } catch (err) {
    await session.abortTransaction();
    console.error('[Houseye] inviteManager error:', err);
    return {
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to invite manager',
    };
  } finally {
    session.endSession();
  }
}
