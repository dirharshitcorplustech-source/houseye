/**
 * HOUSEYE.COM — Owner Registration (Explore Mode)
 * Creates Individual Owner Account + Owner User
 * No subscription activation here — Explore Mode only
 */

import { connectDB } from '@/lib/db/connect';
import { Account, User } from '@/models';
import { hashPassword, validatePasswordPolicy } from '@/lib/auth/password';
import { generateUsername } from '@/lib/utils/username';
import {
  createSessionId,
  createToken,
  SESSION_MAX_AGE,
} from '@/lib/auth/session';
import { Session } from '@/models';
import { AuthSession } from '@/types';

export interface RegisterOwnerInput {
  fullName: string;
  email: string;
  mobile?: string;
  password: string;
  accountType?: 'INDIVIDUAL' | 'ORGANIZATION';
  organizationName?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface RegisterOwnerResult {
  success: true;
  token: string;
  sessionId: string;
  user: {
    id: string;
    username: string;
    fullName: string;
    role: 'OWNER';
    accountId: string;
  };
  redirectTo: string;
}

export interface RegisterOwnerError {
  success: false;
  code: string;
  message: string;
  details?: string[];
}

export async function registerOwner(
  input: RegisterOwnerInput
): Promise<RegisterOwnerResult | RegisterOwnerError> {
  await connectDB();

  const fullName = input.fullName?.trim();
  const email = input.email?.trim().toLowerCase();
  const mobile = input.mobile?.trim();
  const accountType = input.accountType || 'INDIVIDUAL';
  const organizationName = input.organizationName?.trim();

  // Validation
  if (!fullName || fullName.length < 2) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Full name is required (minimum 2 characters)',
    };
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Valid email is required',
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

  if (accountType === 'ORGANIZATION' && !organizationName) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Organization name is required for organization accounts',
    };
  }

  // Uniqueness checks
  const existingEmail = await User.findOne({ email }).exec();
  if (existingEmail) {
    return {
      success: false,
      code: 'EMAIL_EXISTS',
      message: 'An account with this email already exists',
    };
  }

  if (mobile) {
    const existingMobile = await User.findOne({ mobile }).exec();
    if (existingMobile) {
      return {
        success: false,
        code: 'MOBILE_EXISTS',
        message: 'An account with this mobile number already exists',
      };
    }
  }

  // Create Account (Explore Mode)
  const account = await Account.create({
    accountType,
    name: accountType === 'ORGANIZATION' ? organizationName! : fullName,
    organizationName:
      accountType === 'ORGANIZATION' ? organizationName : undefined,
    billingEmail: email,
    billingMobile: mobile,
    subscriptionStatus: 'EXPLORE',
    autoRenew: true,
    usage: {
      properties: 0,
      units: 0,
      primaryTenants: 0,
      admins: 0,
      managers: 0,
      storageBytes: 0,
      externalNotificationsUsed: 0,
    },
    addOns: {
      extraUnits: 0,
      extraAdmins: 0,
      extraManagers: 0,
      extraStorageGB: 0,
      extraNotifications: 0,
    },
  });

  // Generate unique username
  let username = generateUsername('OWNER', fullName);
  let attempts = 0;
  while (await User.findOne({ username }).exec()) {
    username = generateUsername('OWNER', fullName);
    attempts++;
    if (attempts > 10) {
      return {
        success: false,
        code: 'USERNAME_GENERATION_FAILED',
        message: 'Could not generate unique username. Please try again.',
      };
    }
  }

  const passwordHash = await hashPassword(input.password);

  const user = await User.create({
    accountId: account._id,
    role: 'OWNER',
    username,
    email,
    mobile,
    passwordHash,
    fullName,
    status: 'ACTIVE',
    isEmailVerified: false, // verification can be added later
    isMobileVerified: false,
    failedLoginAttempts: 0,
    mfaEnabled: false,
    permissions: [], // Owner has full account authority by role
  });

  // Auto-login after registration
  const sessionId = createSessionId();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);

  await Session.create({
    sessionId,
    userId: user._id,
    accountId: account._id,
    role: 'OWNER',
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    lastActiveAt: new Date(),
    expiresAt,
  });

  const authPayload: AuthSession = {
    userId: user._id.toString(),
    accountId: account._id.toString(),
    role: 'OWNER',
    username: user.username,
    email: user.email,
    sessionId,
    isSuperAdmin: false,
  };

  const token = await createToken(authPayload);

  return {
    success: true,
    token,
    sessionId,
    user: {
      id: user._id.toString(),
      username: user.username,
      fullName: user.fullName,
      role: 'OWNER',
      accountId: account._id.toString(),
    },
    redirectTo: '/dashboard',
  };
}
