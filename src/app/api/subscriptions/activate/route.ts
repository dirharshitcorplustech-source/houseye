/**
 * HOUSEYE.COM — POST /api/subscriptions/activate
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-session';
import { activateSubscription } from '@/services/subscriptions/activate';
import { successResponse, Errors } from '@/lib/utils/response';
import { PlanId } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();

    const body = await req.json();
    const planId = body.planId as PlanId;
    const cycle = body.cycle === 'annual' ? 'annual' : 'monthly';

    const result = await activateSubscription(user, {
      planId,
      cycle,
      addOns: body.addOns,
      paymentRef: body.paymentRef,
      taxRate: body.taxRate,
    });

    if (!result.success) {
      const statusMap: Record<string, number> = {
        FORBIDDEN: 403,
        VALIDATION_ERROR: 422,
        PAYMENT_REQUIRED: 402,
        NOT_FOUND: 404,
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
      {
        subscription: result.subscription,
        invoice: result.invoice,
      },
      'Subscription activated'
    );
  } catch (err) {
    console.error('[Houseye] activate subscription:', err);
    return Errors.server();
  }
}
