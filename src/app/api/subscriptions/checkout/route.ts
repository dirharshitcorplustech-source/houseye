/**
 * HOUSEYE.COM — Create Razorpay order for subscription
 * Client completes checkout; webhook / verify activates plan.
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-session';
import { isOwner, isSuperAdmin } from '@/services/authorization';
import { PLAN_PRICING, PLAN_NAMES } from '@/constants/plans';
import { PlanId } from '@/types';
import { createRazorpayOrder, isRazorpayConfigured } from '@/services/payments/razorpay';
import { allowDevSubscription } from '@/lib/config/env';
import { activateSubscription } from '@/services/subscriptions/activate';
import { successResponse, Errors } from '@/lib/utils/response';
import { nanoid } from 'nanoid';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();
    if (!isOwner(user) && !isSuperAdmin(user)) {
      return Errors.forbidden('Only Owner can checkout subscription');
    }
    if (!user.accountId) return Errors.forbidden();

    const body = await req.json();
    const planId = body.planId as PlanId;
    const cycle = body.cycle === 'annual' ? 'annual' : 'monthly';

    if (!PLAN_PRICING[planId]) {
      return Errors.validation('Invalid plan');
    }

    const pricing = PLAN_PRICING[planId];
    const amountInr = cycle === 'annual' ? pricing.annual : pricing.monthly;
    const amountPaise = Math.round(amountInr * 100);

    // Production / configured Razorpay path
    if (isRazorpayConfigured()) {
      const order = await createRazorpayOrder({
        accountId: user.accountId,
        planId,
        cycle,
        amountPaise,
        receipt: `sub_${nanoid(10)}`,
      });

      if (!order.success) {
        return Errors.server(order.message);
      }

      return successResponse({
        mode: 'razorpay',
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        keyId: order.keyId,
        planId,
        cycle,
        planName: PLAN_NAMES[planId],
      });
    }

    // Dev-only direct activate
    if (allowDevSubscription()) {
      const result = await activateSubscription(user, {
        planId,
        cycle,
        paymentRef: `DEV_CHECKOUT_${nanoid(8)}`,
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
      return successResponse({
        mode: 'dev_activate',
        subscription: result.subscription,
        invoice: result.invoice,
      });
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'GATEWAY_NOT_CONFIGURED',
          message:
            'Payment gateway is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.',
        },
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[Houseye] checkout:', err);
    return Errors.server();
  }
}
