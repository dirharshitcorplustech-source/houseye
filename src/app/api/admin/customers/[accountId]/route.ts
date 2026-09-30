import { getCurrentUser } from '@/lib/auth/get-session';
import { getCustomerDetail } from '@/services/admin/customers';
import { successResponse, Errors } from '@/lib/utils/response';

export async function GET(
  _req: Request,
  { params }: { params: { accountId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();
    if (!user.isSuperAdmin) return Errors.forbidden();

    const detail = await getCustomerDetail(params.accountId);
    if (!detail) return Errors.notFound('Customer not found');

    return successResponse(detail);
  } catch (err) {
    console.error('[Houseye] admin customer detail:', err);
    return Errors.server();
  }
}
