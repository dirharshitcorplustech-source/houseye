/**
 * HOUSEYE.COM — Account deletion request
 * POST { reason, password }
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-session';
import { requestAccountDeletion } from '@/services/account/deletion';
import { connectDB } from '@/lib/db/connect';
import { User } from '@/models';
import { verifyPassword } from '@/lib/auth/password';
import { successResponse, Errors } from '@/lib/utils/response';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();

    const body = await req.json();
    await connectDB();

    const dbUser = await User.findById(user.id).select('+passwordHash').exec();
    if (!dbUser) return Errors.unauthorized();

    const passwordOk = await verifyPassword(
      body.password || '',
      dbUser.passwordHash
    );

    const result = await requestAccountDeletion(
      user,
      body.reason || '',
      passwordOk
    );

    if (!result.success) {
      const statusMap: Record<string, number> = {
        FORBIDDEN: 403,
        VALIDATION_ERROR: 422,
        CONFLICT: 409,
        NOT_FOUND: 404,
      };
      const status = statusMap[result.code] || 400;
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: result.code, message: result.message },
        }),
        { status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return successResponse(
      {
        deletionRequestedAt: result.deletionRequestedAt,
        endsAt: result.endsAt,
      },
      'Deletion requested. Account enters 30-day waiting period.'
    );
  } catch (err) {
    console.error('[Houseye] account deletion:', err);
    return Errors.server();
  }
}
