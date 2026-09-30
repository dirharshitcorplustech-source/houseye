import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-session';
import { markOverdueBills } from '@/services/jobs/mark-overdue-bills';
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

    const result = await markOverdueBills();
    return successResponse(result, `Marked ${result.updated} bills overdue`);
  } catch (err) {
    console.error('[Houseye] mark-overdue:', err);
    return Errors.server();
  }
}
