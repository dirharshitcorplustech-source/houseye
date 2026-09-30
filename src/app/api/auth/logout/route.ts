/**
 * HOUSEYE.COM — POST /api/auth/logout
 * Terminates only the current session (not all devices)
 */

import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import { Session } from '@/models';
import { verifyToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { successResponse } from '@/lib/utils/response';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (token) {
      const session = await verifyToken(token);
      if (session?.sessionId) {
        await connectDB();
        await Session.deleteOne({ sessionId: session.sessionId });
      }
    }

    const response = successResponse(null, 'Logged out');
    response.cookies.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (err) {
    console.error('[Houseye] Logout error:', err);
    const response = successResponse(null, 'Logged out');
    response.cookies.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      path: '/',
      maxAge: 0,
    });
    return response;
  }
}
