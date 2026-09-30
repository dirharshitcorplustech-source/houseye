import { getCurrentUser } from '@/lib/auth/get-session';
import { cancelSubscription } from '@/services/subscriptions/cancel';
import { successResponse, Errors } from '@/lib/utils/response';

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();

    const result = await cancelSubscription(user);
    if (!result.success) {
      const status = result.code === 'FORBIDDEN' ? 403 : 400;
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: result.code, message: result.message },
        }),
        { status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return successResponse(
      { endAt: result.endAt },
      result.message
    );
  } catch (err) {
    console.error('[Houseye] cancel subscription:', err);
    return Errors.server();
  }
}
