/**
 * HOUSEYE.COM — GET /api/auth/me
 * Returns current authenticated user
 */

import { getCurrentUser } from '@/lib/auth/get-session';
import { successResponse, Errors } from '@/lib/utils/response';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Errors.unauthorized();
    }

    return successResponse({
      id: user.id,
      accountId: user.accountId,
      role: user.role,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
      subscriptionStatus: user.subscriptionStatus,
      planId: user.planId,
      permissions: user.permissions,
    });
  } catch (err) {
    console.error('[Houseye] /me error:', err);
    return Errors.server();
  }
}
