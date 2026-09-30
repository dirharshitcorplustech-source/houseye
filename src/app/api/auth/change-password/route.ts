import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-session';
import { changePassword } from '@/services/auth/change-password';
import { successResponse, Errors } from '@/lib/utils/response';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();

    const body = await req.json();
    const result = await changePassword(
      user,
      body.currentPassword || '',
      body.newPassword || ''
    );

    if (!result.success) {
      const status =
        result.code === 'INVALID_PASSWORD'
          ? 401
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

    const response = successResponse(null, result.message);
    // Clear cookie since all sessions invalidated
    response.cookies.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      path: '/',
      maxAge: 0,
    });
    return response;
  } catch (err) {
    console.error('[Houseye] change-password:', err);
    return Errors.server();
  }
}
