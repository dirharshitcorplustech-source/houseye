import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-session';
import { suspendCustomer, unsuspendCustomer } from '@/services/admin/customers';
import { successResponse, Errors } from '@/lib/utils/response';

export async function POST(
  req: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();
    if (!user.isSuperAdmin) return Errors.forbidden();

    const body = await req.json();
    if (body.action === 'unsuspend') {
      const result = await unsuspendCustomer(params.accountId);
      if (!result.success) return Errors.notFound(result.message);
      return successResponse(null, 'Account unsuspended');
    }

    const reason = (body.reason || '').trim();
    if (!reason) {
      return Errors.validation('Suspension reason is required');
    }

    const result = await suspendCustomer(params.accountId, reason, user.id);
    if (!result.success) return Errors.notFound(result.message);

    return successResponse(null, 'Account suspended');
  } catch (err) {
    console.error('[Houseye] suspend:', err);
    return Errors.server();
  }
}
