/**
 * HOUSEYE.COM — Client-side Razorpay success → verify signature → activate
 * Webhook is primary; this is secondary confirmation path.
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-session';
import { verifyRazorpayPaymentSignature } from '@/services/payments/razorpay';
import { activateSubscription } from '@/services/subscriptions/activate';
import { successResponse, Errors } from '@/lib/utils/response';
import { PlanId } from '@/types';
import {
  getIdempotentResponse,
  saveIdempotentResponse,
} from '@/lib/security/idempotency';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();

    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planId,
      cycle,
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return Errors.validation('Missing Razorpay payment fields');
    }

    const idemKey = `rzp_${razorpay_payment_id}`;
    const cached = await getIdempotentResponse(idemKey, 'subscription.verify');
    if (cached) {
      return new Response(JSON.stringify(cached.body), {
        status: cached.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const valid = verifyRazorpayPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_SIGNATURE',
            message: 'Payment signature verification failed',
          },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await activateSubscription(user, {
      planId: planId as PlanId,
      cycle: cycle === 'annual' ? 'annual' : 'monthly',
      paymentRef: razorpay_payment_id,
    });

    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: result.code, message: result.message },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const responseBody = {
      success: true,
      message: 'Subscription activated',
      data: {
        subscription: result.subscription,
        invoice: result.invoice,
      },
    };

    await saveIdempotentResponse({
      key: idemKey,
      scope: 'subscription.verify',
      accountId: user.accountId || undefined,
      status: 200,
      body: responseBody,
    });

    return successResponse(
      {
        subscription: result.subscription,
        invoice: result.invoice,
      },
      'Subscription activated'
    );
  } catch (err) {
    console.error('[Houseye] verify-payment:', err);
    return Errors.server();
  }
}
