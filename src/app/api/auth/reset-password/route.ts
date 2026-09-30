import { NextRequest } from 'next/server';
import { confirmPasswordReset } from '@/services/auth/password-reset';
import { successResponse, Errors } from '@/lib/utils/response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await confirmPasswordReset({
      token: body.token,
      otp: body.otp,
      newPassword: body.newPassword,
    });

    if (!result.success) {
      const status =
        result.code === 'INVALID_TOKEN' || result.code === 'INVALID_OTP'
          ? 400
          : result.code === 'VALIDATION_ERROR'
            ? 422
            : 400;
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: result.code,
            message: result.message,
            details: result.details,
          },
        }),
        { status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return successResponse(null, result.message);
  } catch (err) {
    console.error('[Houseye] reset-password:', err);
    return Errors.server();
  }
}
