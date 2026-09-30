import { getCurrentUser } from '@/lib/auth/get-session';
import { getDashboardStats } from '@/services/dashboard/stats';
import { successResponse, Errors } from '@/lib/utils/response';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();
    if (user.role === 'TENANT') return Errors.forbidden();

    const stats = await getDashboardStats(user);
    return successResponse({ stats });
  } catch (err) {
    console.error('[Houseye] dashboard stats:', err);
    return Errors.server();
  }
}
