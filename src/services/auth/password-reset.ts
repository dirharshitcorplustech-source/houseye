/**
 * HOUSEYE.COM — Password reset request + confirm
 * Methods: Email OTP, SMS OTP, Email link (architecture)
 * Without real providers: OTP logged in dev, token returned for link flow in non-prod
 */

import { connectDB } from '@/lib/db/connect';
import { User, Session, PasswordResetToken } from '@/models';
import {
  hashPassword,
  validatePasswordPolicy,
  verifyPassword,
} from '@/lib/auth/password';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { sendEmail } from '@/services/email/send';
import { sendSms } from '@/services/sms/send';

const OTP_TTL_MINUTES = 15;

export async function requestPasswordReset(input: {
  usernameOrEmail: string;
  method: 'EMAIL_OTP' | 'SMS_OTP' | 'EMAIL_LINK';
}): Promise<
  | {
      success: true;
      message: string;
      /** Dev only — never in production response */
      devToken?: string;
      devOtp?: string;
    }
  | { success: false; code: string; message: string }
> {
  await connectDB();

  const q = input.usernameOrEmail.trim();
  const user = await User.findOne({
    $or: [
      { username: q.toUpperCase() },
      { email: q.toLowerCase() },
    ],
    status: { $in: ['ACTIVE', 'SUSPENDED'] },
  }).exec();

  // Always generic message to avoid user enumeration
  const generic = {
    success: true as const,
    message:
      'If an account exists, reset instructions have been sent using the selected method.',
  };

  if (!user) return generic;

  if (input.method === 'EMAIL_OTP' || input.method === 'EMAIL_LINK') {
    if (!user.email) {
      return generic;
    }
  }
  if (input.method === 'SMS_OTP' && !user.mobile) {
    return generic;
  }

  const token = nanoid(48);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  let otpPlain: string | undefined;
  let otpHash: string | undefined;

  if (input.method === 'EMAIL_OTP' || input.method === 'SMS_OTP') {
    otpPlain = String(Math.floor(100000 + Math.random() * 900000));
    otpHash = await bcrypt.hash(otpPlain, 10);
  }

  await PasswordResetToken.create({
    userId: user._id,
    token,
    method: input.method,
    otpHash,
    expiresAt,
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const resetLink = `${baseUrl}/reset-password?token=${token}`;

  if (input.method === 'EMAIL_LINK' || input.method === 'EMAIL_OTP') {
    if (user.email) {
      const body =
        input.method === 'EMAIL_OTP'
          ? `Your Houseye password reset OTP is ${otpPlain}. Valid for 15 minutes.`
          : `Reset your Houseye password: ${resetLink}\n\nThis link expires in 15 minutes.`;
      await sendEmail({
        to: user.email,
        subject: 'Houseye password reset',
        text: body,
      });
    }
  }

  if (input.method === 'SMS_OTP' && user.mobile && otpPlain) {
    await sendSms({
      to: user.mobile,
      message: `Houseye OTP: ${otpPlain}. Valid 15 min.`,
    });
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log(
      `[Houseye] Password reset for ${user.username}: method=${input.method} token=${token} otp=${otpPlain || 'N/A'}`
    );
  }

  const devExtras =
    process.env.NODE_ENV !== 'production' ||
    process.env.ALLOW_DEV_SUBSCRIPTION === 'true'
      ? { devToken: token, devOtp: otpPlain }
      : {};

  return { ...generic, ...devExtras };
}

export async function confirmPasswordReset(input: {
  token: string;
  otp?: string;
  newPassword: string;
}): Promise<
  | { success: true; message: string }
  | { success: false; code: string; message: string; details?: string[] }
> {
  await connectDB();

  const passwordCheck = validatePasswordPolicy(input.newPassword);
  if (!passwordCheck.valid) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Password does not meet requirements',
      details: passwordCheck.errors,
    };
  }

  const reset = await PasswordResetToken.findOne({
    token: input.token.trim(),
    usedAt: null,
  })
    .select('+otpHash')
    .exec();

  if (!reset || reset.expiresAt < new Date()) {
    return {
      success: false,
      code: 'INVALID_TOKEN',
      message: 'Reset link or code is invalid or expired',
    };
  }

  if (reset.method === 'EMAIL_OTP' || reset.method === 'SMS_OTP') {
    if (!input.otp || !reset.otpHash) {
      return {
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'OTP is required',
      };
    }
    const otpOk = await bcrypt.compare(input.otp, reset.otpHash);
    if (!otpOk) {
      return {
        success: false,
        code: 'INVALID_OTP',
        message: 'Invalid OTP',
      };
    }
  }

  const user = await User.findById(reset.userId)
    .select('+passwordHash +previousPasswordHash')
    .exec();

  if (!user) {
    return {
      success: false,
      code: 'NOT_FOUND',
      message: 'User not found',
    };
  }

  // Only immediate previous password cannot be reused
  if (user.previousPasswordHash) {
    const sameAsPrev = await verifyPassword(
      input.newPassword,
      user.previousPasswordHash
    );
    if (sameAsPrev) {
      return {
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Cannot reuse your immediately previous password',
      };
    }
  }

  user.previousPasswordHash = user.passwordHash;
  user.passwordHash = await hashPassword(input.newPassword);
  user.passwordChangedAt = new Date();
  user.failedLoginAttempts = 0;
  user.lockedUntil = undefined;
  await user.save();

  reset.usedAt = new Date();
  await reset.save();

  // Invalidate all sessions (password change rule)
  await Session.deleteMany({ userId: user._id });

  return {
    success: true,
    message: 'Password updated. Please log in with your new password.',
  };
}
