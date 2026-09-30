import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-session';
import { expireSubscriptions } from '@/services/jobs/expire-subscriptions';
import { successResponse, Errors } from '@/lib/utils/response';

export async function POST(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const headerSecret = req.headers.get('x-cron-secret');
    const user = await getCurrentUser();

    const authorized =
      (cronSecret && headerSecret === cronSecret) ||
      (user && user.isSuperAdmin);

    if (!authorized) return Errors.forbidden();

    const result = await expireSubscriptions();
    return successResponse(
      result,
      `Expired ${result.expired} subscription(s)`
    );
  } catch (err) {
    console.error('[Houseye] expire-subscriptions:', err);
    return Errors.server();
  }
}
