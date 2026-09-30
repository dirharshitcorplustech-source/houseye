import { NextRequest } from 'next/server';
import { requestPasswordReset } from '@/services/auth/password-reset';
import { successResponse, Errors } from '@/lib/utils/response';
import { rateLimit } from '@/lib/security/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = rateLimit(`forgot:${ip}`, 10, 15 * 60 * 1000);
    if (!rl.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: `Too many requests. Try again in ${rl.retryAfterSec}s`,
          },
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const body = await req.json();
    const method = body.method || 'EMAIL_LINK';

    if (!['EMAIL_OTP', 'SMS_OTP', 'EMAIL_LINK'].includes(method)) {
      return Errors.validation('Invalid reset method');
    }

    if (!body.usernameOrEmail?.trim()) {
      return Errors.validation('Username or email is required');
    }

    const result = await requestPasswordReset({
      usernameOrEmail: body.usernameOrEmail,
      method,
    });

    if (!result.success) {
      return Errors.validation(result.message);
    }

    return successResponse(
      {
        ...(result.devToken ? { devToken: result.devToken } : {}),
        ...(result.devOtp ? { devOtp: result.devOtp } : {}),
      },
      result.message
    );
  } catch (err) {
    console.error('[Houseye] forgot-password:', err);
    return Errors.server();
  }
}
