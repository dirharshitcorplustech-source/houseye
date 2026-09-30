/**
 * HOUSEYE.COM — Login Service
 * Common login → role-based dashboard routing
 * No role selector on login screen
 */

import { connectDB } from '@/lib/db/connect';
import { User, Session, Account } from '@/models';
import { verifyPassword } from '@/lib/auth/password';
import {
  createSessionId,
  createToken,
  SESSION_MAX_AGE,
} from '@/lib/auth/session';
import {
  isAccountLocked,
  getLockoutRemainingMinutes,
  calculateNewFailedAttempts,
  resetFailedAttempts,
} from '@/lib/auth/lockout';
import { AuthSession, Role } from '@/types';

export interface LoginInput {
  username: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface LoginResult {
  success: true;
  token: string;
  sessionId: string;
  user: {
    id: string;
    username: string;
    fullName: string;
    role: Role;
    accountId?: string;
    isSuperAdmin: boolean;
  };
  redirectTo: string;
}

export interface LoginError {
  success: false;
  code: string;
  message: string;
}

export async function loginUser(
  input: LoginInput
): Promise<LoginResult | LoginError> {
  await connectDB();

  const username = input.username.trim().toUpperCase();

  const user = await User.findOne({ username })
    .select('+passwordHash')
    .exec();

  if (!user) {
    return {
      success: false,
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid username or password',
    };
  }

  // Check lockout first — even correct password cannot bypass
  if (isAccountLocked(user.lockedUntil)) {
    const mins = getLockoutRemainingMinutes(user.lockedUntil!);
    return {
      success: false,
      code: 'ACCOUNT_LOCKED',
      message: `Account locked due to too many failed attempts. Try again in ${mins} minute(s).`,
    };
  }

  // Status checks
  if (user.status === 'SUSPENDED') {
    return {
      success: false,
      code: 'ACCOUNT_SUSPENDED',
      message: 'Your account has been suspended. Contact support.',
    };
  }

  if (user.status === 'REMOVED' || user.status === 'DEACTIVATED') {
    return {
      success: false,
      code: 'ACCOUNT_INACTIVE',
      message: 'This account is no longer active.',
    };
  }

  if (user.status === 'PENDING_INVITATION') {
    return {
      success: false,
      code: 'INVITATION_PENDING',
      message: 'Please accept your invitation and set a password first.',
    };
  }

  // Account-level checks (for non Super Admin)
  if (user.role !== 'SUPER_ADMIN' && user.accountId) {
    const account = await Account.findById(user.accountId).exec();
    if (!account) {
      return {
        success: false,
        code: 'ACCOUNT_NOT_FOUND',
        message: 'Associated account not found.',
      };
    }

    if (account.isSuspended && user.role !== 'OWNER') {
      return {
        success: false,
        code: 'ACCOUNT_SUSPENDED',
        message: 'This account has been suspended.',
      };
    }

    if (account.deactivatedAt) {
      return {
        success: false,
        code: 'ACCOUNT_DELETED',
        message: 'This account has been deactivated. You can request restore.',
      };
    }
  }

  // Verify password
  const passwordValid = await verifyPassword(
    input.password,
    user.passwordHash
  );

  if (!passwordValid) {
    const { attempts, lockedUntil } = calculateNewFailedAttempts(
      user.failedLoginAttempts,
      user.lockedUntil
    );

    user.failedLoginAttempts = attempts;
    user.lockedUntil = lockedUntil || undefined;
    await user.save();

    if (lockedUntil) {
      return {
        success: false,
        code: 'ACCOUNT_LOCKED',
        message: `Too many failed attempts. Account locked for 15 minutes.`,
      };
    }

    return {
      success: false,
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid username or password',
    };
  }

  // Success — reset lockout
  const reset = resetFailedAttempts();
  user.failedLoginAttempts = reset.attempts;
  user.lockedUntil = undefined;
  user.lastLoginAt = new Date();

  // Create session
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

  // Track session id on user (optional)
  if (!user.activeSessionIds) user.activeSessionIds = [];
  user.activeSessionIds.push(sessionId);
  // Keep only last 20
  if (user.activeSessionIds.length > 20) {
    user.activeSessionIds = user.activeSessionIds.slice(-20);
  }
  await user.save();

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

  // Role-based redirect
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
    sessionId,
    user: {
      id: user._id.toString(),
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      accountId: user.accountId?.toString(),
      isSuperAdmin: user.role === 'SUPER_ADMIN',
    },
    redirectTo: redirectMap[user.role],
  };
}
