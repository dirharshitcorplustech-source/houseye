import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-session';
import { rejectPayment } from '@/services/billing/reject-payment';
import { successResponse, Errors } from '@/lib/utils/response';

export async function POST(
  req: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();

    const body = await req.json();
    const result = await rejectPayment(
      user,
      params.paymentId,
      body.rejectionReason || body.reason
    );

    if (!result.success) {
      const statusMap: Record<string, number> = {
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        CONFLICT: 409,
        VALIDATION_ERROR: 422,
        SUBSCRIPTION_INACTIVE: 403,
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

    return successResponse(
      { payment: result.payment },
      'Payment rejected'
    );
  } catch (err) {
    console.error('[Houseye] reject payment:', err);
    return Errors.server();
  }
}
