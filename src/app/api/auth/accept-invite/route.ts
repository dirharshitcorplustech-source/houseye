/**
 * HOUSEYE.COM — POST /api/auth/accept-invite
 */

import { NextRequest } from 'next/server';
import { acceptInvite } from '@/services/auth/accept-invite';
import { successResponse, Errors } from '@/lib/utils/response';
import {
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
} from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      undefined;
    const userAgent = req.headers.get('user-agent') || undefined;

    const result = await acceptInvite({
      token: body.token,
      password: body.password,
      ipAddress: ip,
      userAgent,
    });

    if (!result.success) {
      const status =
        result.code === 'INVALID_TOKEN'
          ? 404
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

    const response = successResponse(
      {
        user: result.user,
        redirectTo: result.redirectTo,
      },
      'Invitation accepted'
    );

    response.cookies.set(
      SESSION_COOKIE_NAME,
      result.token,
      getSessionCookieOptions()
    );

    return response;
  } catch (err) {
    console.error('[Houseye] accept-invite:', err);
    return Errors.server();
  }
}
