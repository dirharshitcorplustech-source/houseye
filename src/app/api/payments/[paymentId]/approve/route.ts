import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-session';
import { approvePayment } from '@/services/billing/approve-payment';
import { successResponse, Errors } from '@/lib/utils/response';
import {
  getIdempotentResponse,
  saveIdempotentResponse,
} from '@/lib/security/idempotency';

export async function POST(
  req: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();

    const idemKey =
      req.headers.get('idempotency-key') ||
      req.headers.get('Idempotency-Key') ||
      '';

    if (idemKey) {
      const cached = await getIdempotentResponse(
        idemKey,
        `payment.approve:${params.paymentId}`
      );
      if (cached) {
        return new Response(JSON.stringify(cached.body), {
          status: cached.status,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    const result = await approvePayment(user, params.paymentId);

    if (!result.success) {
      const statusMap: Record<string, number> = {
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        CONFLICT: 409,
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

    const body = {
      success: true,
      message: 'Payment approved',
      data: { payment: result.payment, bill: result.bill },
    };
    if (idemKey) {
      await saveIdempotentResponse({
        key: idemKey,
        scope: `payment.approve:${params.paymentId}`,
        accountId: user.accountId || undefined,
        status: 200,
        body,
      });
    }
    return successResponse(
      { payment: result.payment, bill: result.bill },
      'Payment approved'
    );
  } catch (err) {
    console.error('[Houseye] approve payment:', err);
    return Errors.server();
  }
}
