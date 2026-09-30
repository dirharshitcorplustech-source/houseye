/**
 * HOUSEYE.COM — Invite Admin
 * Only Owner (or Super Admin). Consumes admin entitlement.
 * Essential plan = 0 admins unless add-on.
 */

import mongoose from 'mongoose';
import { connectDB } from '@/lib/db/connect';
import { User, Account } from '@/models';
import { CurrentUser } from '@/lib/auth/get-session';
import { isOwner, isSuperAdmin } from '@/services/authorization';
import { canConsume } from '@/services/entitlement';
import { generateUsername } from '@/lib/utils/username';
import { DEFAULT_ADMIN_PERMISSIONS } from '@/constants/permissions';
import { hashPassword } from '@/lib/auth/password';
import { nanoid } from 'nanoid';

export interface InviteAdminInput {
  fullName: string;
  email?: string;
  mobile?: string;
  /** Empty = full access within account (custom access via permissions + optional scopes) */
  propertyIds?: string[];
  permissions?: string[];
  fullAccess?: boolean;
}

export async function inviteAdmin(
  actor: CurrentUser,
  input: InviteAdminInput
): Promise<
  | {
      success: true;
      admin: {
        id: string;
        username: string;
        fullName: string;
        status: string;
      };
      inviteLink: string;
      invitationToken: string;
    }
  | { success: false; code: string; message: string }
> {
  if (!isOwner(actor) && !isSuperAdmin(actor)) {
    return {
      success: false,
      code: 'FORBIDDEN',
      message: 'Only the Owner can invite Admins',
    };
  }

  if (!actor.accountId) {
    return { success: false, code: 'FORBIDDEN', message: 'No account context' };
  }

  const fullName = input.fullName?.trim();
  if (!fullName) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Full name is required',
    };
  }

  const entitlement = await canConsume(actor.accountId, 'admins', 1);
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

  let username = generateUsername('ADMIN', fullName);
  let attempts = 0;
  while (await User.findOne({ username }).exec()) {
    username = generateUsername('ADMIN', fullName);
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
  const passwordHash = await hashPassword(nanoid(32));
  const fullAccess = input.fullAccess !== false && !(input.propertyIds?.length);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const [admin] = await User.create(
      [
        {
          accountId: actor.accountId,
          role: 'ADMIN',
          username,
          email: input.email?.toLowerCase().trim(),
          mobile: input.mobile?.trim(),
          passwordHash,
          fullName,
          status: 'PENDING_INVITATION',
          propertyScopes: fullAccess ? [] : input.propertyIds || [],
          permissions: input.permissions || DEFAULT_ADMIN_PERMISSIONS,
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
      { $inc: { 'usage.admins': 1 } },
      { session }
    );

    await session.commitTransaction();

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteLink = `${baseUrl}/accept-invite?token=${invitationToken}`;

    return {
      success: true,
      admin: {
        id: admin._id.toString(),
        username: admin.username,
        fullName: admin.fullName,
        status: admin.status,
      },
      inviteLink,
      invitationToken,
    };
  } catch (err) {
    await session.abortTransaction();
    console.error('[Houseye] inviteAdmin:', err);
    return {
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to invite admin',
    };
  } finally {
    session.endSession();
  }
}
