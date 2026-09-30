import { getCurrentUser } from '@/lib/auth/get-session';
import { approveAccountRestore } from '@/services/account/restore';
import { successResponse, Errors } from '@/lib/utils/response';

export async function POST(
  _req: Request,
  { params }: { params: { accountId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();
    if (!user.isSuperAdmin) return Errors.forbidden();

    const result = await approveAccountRestore(user, params.accountId);
    if (!result.success) {
      const status =
        result.code === 'FORBIDDEN'
          ? 403
          : result.code === 'NOT_FOUND'
            ? 404
            : 409;
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: result.code, message: result.message },
        }),
        { status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return successResponse(null, result.message);
  } catch (err) {
    console.error('[Houseye] restore approve:', err);
    return Errors.server();
  }
}
