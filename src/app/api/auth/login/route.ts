/**
 * HOUSEYE.COM — POST /api/auth/login
 */

import { NextRequest } from 'next/server';
import { loginUser } from '@/services/auth/login';
import { successResponse, Errors } from '@/lib/utils/response';
import { rateLimitAsync } from '@/lib/security/rate-limit-store';
import {
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
} from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = await rateLimitAsync(`login:${ip}`, 20, 15 * 60 * 1000);
    if (!rl.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: `Too many login attempts. Try again in ${rl.retryAfterSec}s`,
          },
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return Errors.validation('Username and password are required');
    }

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      undefined;
    const userAgent = req.headers.get('user-agent') || undefined;

    const result = await loginUser({
      username,
      password,
      ipAddress: ip,
      userAgent,
    });

    if (!result.success) {
      const statusMap: Record<string, number> = {
        INVALID_CREDENTIALS: 401,
        ACCOUNT_LOCKED: 423,
        ACCOUNT_SUSPENDED: 403,
        ACCOUNT_INACTIVE: 403,
        ACCOUNT_DELETED: 403,
        INVITATION_PENDING: 403,
        ACCOUNT_NOT_FOUND: 404,
      };

      const status = statusMap[result.code] || 400;

      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: result.code,
            message: result.message,
          },
        }),
        {
          status,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Set httpOnly session cookie
    const response = successResponse(
      {
        user: result.user,
        redirectTo: result.redirectTo,
      },
      'Login successful'
    );

    response.cookies.set(
      SESSION_COOKIE_NAME,
      result.token,
      getSessionCookieOptions()
    );

    return response;
  } catch (err) {
    console.error('[Houseye] Login error:', err);
    return Errors.server();
  }
}
