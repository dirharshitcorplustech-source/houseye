/**
 * HOUSEYE.COM — Super Admin Bootstrap
 * Creates the first Super Admin from env vars if none exists.
 * Run once on first deploy / setup.
 */

import { connectDB } from '@/lib/db/connect';
import { User } from '@/models';
import { hashPassword, validatePasswordPolicy } from '@/lib/auth/password';
import { generateUsername } from '@/lib/utils/username';

export async function bootstrapSuperAdmin(): Promise<{
  created: boolean;
  message: string;
  username?: string;
}> {
  await connectDB();

  const existing = await User.findOne({ role: 'SUPER_ADMIN' }).exec();
  if (existing) {
    return {
      created: false,
      message: 'Super Admin already exists',
      username: existing.username,
    };
  }

  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const fullName = process.env.SUPER_ADMIN_NAME || 'Houseye Super Admin';

  if (!email || !password) {
    return {
      created: false,
      message:
        'SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set in environment',
    };
  }

  const passwordCheck = validatePasswordPolicy(password);
  if (!passwordCheck.valid) {
    return {
      created: false,
      message: `Super Admin password does not meet policy: ${passwordCheck.errors.join(', ')}`,
    };
  }

  let username = generateUsername('SUPER_ADMIN', fullName);
  let attempts = 0;
  while (await User.findOne({ username }).exec()) {
    username = generateUsername('SUPER_ADMIN', fullName);
    attempts++;
    if (attempts > 10) {
      return {
        created: false,
        message: 'Could not generate unique Super Admin username',
      };
    }
  }

  const passwordHash = await hashPassword(password);

  await User.create({
    // Super Admin has no accountId
    role: 'SUPER_ADMIN',
    username,
    email: email.toLowerCase().trim(),
    passwordHash,
    fullName,
    status: 'ACTIVE',
    isEmailVerified: true,
    isMobileVerified: false,
    mfaEnabled: false, // MFA setup should be forced on first login (Phase later)
    failedLoginAttempts: 0,
    permissions: [],
  });

  return {
    created: true,
    message: 'Super Admin created successfully',
    username,
  };
}
