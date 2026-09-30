import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-session';
import { listCustomers } from '@/services/admin/customers';
import { successResponse, Errors } from '@/lib/utils/response';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();
    if (!user.isSuperAdmin) return Errors.forbidden();

    const status = req.nextUrl.searchParams.get('status') || undefined;
    const search = req.nextUrl.searchParams.get('search') || undefined;
    const limit = Number(req.nextUrl.searchParams.get('limit') || 50);
    const skip = Number(req.nextUrl.searchParams.get('skip') || 0);

    const result = await listCustomers({ status, search, limit, skip });
    return successResponse(result);
  } catch (err) {
    console.error('[Houseye] admin customers:', err);
    return Errors.server();
  }
}
