/**
 * HOUSEYE.COM — Accept Manager/Admin/Tenant invitation
 * Sets password, activates account
 */

import { connectDB } from '@/lib/db/connect';
import { User, Session } from '@/models';
import {
  hashPassword,
  validatePasswordPolicy,
} from '@/lib/auth/password';
import {
  createSessionId,
  createToken,
  SESSION_MAX_AGE,
} from '@/lib/auth/session';
import { AuthSession, Role } from '@/types';

export interface AcceptInviteInput {
  token: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function acceptInvite(
  input: AcceptInviteInput
): Promise<
  | {
      success: true;
      token: string;
      redirectTo: string;
      user: {
        id: string;
        username: string;
        fullName: string;
        role: Role;
      };
    }
  | { success: false; code: string; message: string; details?: string[] }
> {
  await connectDB();

  if (!input.token?.trim()) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Invitation token is required',
    };
  }

  const passwordCheck = validatePasswordPolicy(input.password);
  if (!passwordCheck.valid) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Password does not meet requirements',
      details: passwordCheck.errors,
    };
  }

  const user = await User.findOne({
    invitationToken: input.token.trim(),
    status: 'PENDING_INVITATION',
  })
    .select('+invitationToken +passwordHash')
    .exec();

  if (!user) {
    return {
      success: false,
      code: 'INVALID_TOKEN',
      message: 'Invitation is invalid or has already been used',
    };
  }

  user.passwordHash = await hashPassword(input.password);
  user.status = 'ACTIVE';
  user.invitationAcceptedAt = new Date();
  user.invitationToken = undefined;
  user.passwordChangedAt = new Date();
  await user.save();

  // Auto-login
  const sessionId = createSessionId();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);

  await Session.create({
    sessionId,
    userId: user._id,
    accountId: user.accountId,
    role: user.role,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    lastActiveAt: new Date(),
    expiresAt,
  });

  const authPayload: AuthSession = {
    userId: user._id.toString(),
    accountId: user.accountId?.toString() || '',
    role: user.role,
    username: user.username,
    email: user.email,
    sessionId,
    isSuperAdmin: user.role === 'SUPER_ADMIN',
  };

  const token = await createToken(authPayload);

  const redirectMap: Record<Role, string> = {
    SUPER_ADMIN: '/admin',
    OWNER: '/dashboard',
    ADMIN: '/dashboard',
    MANAGER: '/dashboard',
    TENANT: '/tenant',
  };

  return {
    success: true,
    token,
    redirectTo: redirectMap[user.role],
    user: {
      id: user._id.toString(),
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    },
  };
}
