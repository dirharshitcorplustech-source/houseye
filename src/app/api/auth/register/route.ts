/**
 * HOUSEYE.COM — POST /api/auth/register
 * Owner registration → Explore Mode
 */

import { NextRequest } from 'next/server';
import { registerOwner } from '@/services/auth/register-owner';
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

    const result = await registerOwner({
      fullName: body.fullName,
      email: body.email,
      mobile: body.mobile,
      password: body.password,
      accountType: body.accountType,
      organizationName: body.organizationName,
      ipAddress: ip,
      userAgent,
    });

    if (!result.success) {
      const status =
        result.code === 'EMAIL_EXISTS' || result.code === 'MOBILE_EXISTS'
          ? 409
          : 422;

      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: result.code,
            message: result.message,
            details: result.details,
          },
        }),
        {
          status,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const response = successResponse(
      {
        user: result.user,
        redirectTo: result.redirectTo,
      },
      'Account created. You are in Explore Mode.',
      201
    );

    response.cookies.set(
      SESSION_COOKIE_NAME,
      result.token,
      getSessionCookieOptions()
    );

    return response;
  } catch (err) {
    console.error('[Houseye] Register error:', err);
    return Errors.server();
  }
}
