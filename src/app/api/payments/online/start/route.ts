import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-session';
import { startTenantOnlinePayment } from '@/services/billing/online-pay';
import { successResponse, Errors } from '@/lib/utils/response';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();

    const body = await req.json();
    const result = await startTenantOnlinePayment(user, {
      billId: body.billId,
      amount: body.amount,
    });

    if (!result.success) {
      const statusMap: Record<string, number> = {
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        CONFLICT: 409,
        VALIDATION_ERROR: 422,
        GATEWAY_DISABLED: 503,
        GATEWAY_ERROR: 502,
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

    return successResponse({
      ...result,
      mode: 'owner_gateway',
      note: 'Money is collected on the property owner merchant account, not Houseye.',
    });
  } catch (err) {
    console.error('[Houseye] online start:', err);
    return Errors.server();
  }
}
