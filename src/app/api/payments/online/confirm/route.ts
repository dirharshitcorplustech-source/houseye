import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-session';
import {
  confirmTenantOnlinePayment,
  confirmTenantStripePayment,
} from '@/services/billing/online-pay';
import { successResponse, Errors } from '@/lib/utils/response';
import {
  getIdempotentResponse,
  saveIdempotentResponse,
} from '@/lib/security/idempotency';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();

    const body = await req.json();
    const provider = body.provider || 'RAZORPAY';

    const idemKey =
      provider === 'STRIPE'
        ? body.paymentIntentId
          ? `tenant_stripe_${body.paymentIntentId}`
          : ''
        : body.razorpay_payment_id
          ? `tenant_pay_${body.razorpay_payment_id}`
          : '';

    if (idemKey) {
      const cached = await getIdempotentResponse(idemKey, 'tenant.online_pay');
      if (cached) {
        return new Response(JSON.stringify(cached.body), {
          status: cached.status,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    const result =
      provider === 'STRIPE'
        ? await confirmTenantStripePayment(user, {
            paymentId: body.paymentId,
            paymentIntentId: body.paymentIntentId,
          })
        : await confirmTenantOnlinePayment(user, {
            paymentId: body.paymentId,
            razorpay_order_id: body.razorpay_order_id,
            razorpay_payment_id: body.razorpay_payment_id,
            razorpay_signature: body.razorpay_signature,
          });

    if (!result.success) {
      const status =
        result.code === 'INVALID_SIGNATURE'
          ? 400
          : result.code === 'FORBIDDEN'
            ? 403
            : 400;
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: result.code, message: result.message },
        }),
        { status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const responseBody = {
      success: true,
      message: 'Payment successful',
      data: { payment: result.payment, bill: result.bill },
    };

    if (idemKey) {
      await saveIdempotentResponse({
        key: idemKey,
        scope: 'tenant.online_pay',
        accountId: user.accountId || undefined,
        status: 200,
        body: responseBody,
      });
    }

    return successResponse(
      { payment: result.payment, bill: result.bill },
      'Payment successful'
    );
  } catch (err) {
    console.error('[Houseye] online confirm:', err);
    return Errors.server();
  }
}
