/**
 * HOUSEYE.COM — Razorpay webhook
 * Primary source of truth for payment success.
 */

import { NextRequest } from 'next/server';
import { verifyRazorpayWebhookSignature } from '@/services/payments/razorpay';
import { connectDB } from '@/lib/db/connect';
import { Account, User } from '@/models';
import { activateSubscription } from '@/services/subscriptions/activate';
import {
  getIdempotentResponse,
  saveIdempotentResponse,
} from '@/lib/security/idempotency';
import { PlanId } from '@/types';
import { CurrentUser } from '@/lib/auth/get-session';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature') || '';

  if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let event: {
    event?: string;
    payload?: {
      payment?: {
        entity?: {
          id?: string;
          order_id?: string;
          status?: string;
          notes?: Record<string, string>;
        };
      };
      order?: {
        entity?: {
          id?: string;
          notes?: Record<string, string>;
        };
      };
    };
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
    });
  }

  // Handle payment captured
  if (
    event.event === 'payment.captured' ||
    event.event === 'order.paid'
  ) {
    const payment = event.payload?.payment?.entity;
    const notes =
      payment?.notes || event.payload?.order?.entity?.notes || {};
    const paymentId = payment?.id;
    const accountId = notes.accountId;
    const planId = notes.planId as PlanId;
    const cycle = notes.cycle === 'annual' ? 'annual' : 'monthly';

    if (paymentId && accountId && planId && notes.purpose === 'houseye_subscription') {
      const idemKey = `wh_${paymentId}`;
      const cached = await getIdempotentResponse(idemKey, 'webhook.razorpay');
      if (cached) {
        return new Response(JSON.stringify({ status: 'ok', cached: true }), {
          status: 200,
        });
      }

      await connectDB();
      const owner = await User.findOne({
        accountId,
        role: 'OWNER',
        status: 'ACTIVE',
      }).exec();

      if (owner) {
        const actor: CurrentUser = {
          id: owner._id.toString(),
          accountId: accountId,
          role: 'OWNER',
          username: owner.username,
          fullName: owner.fullName,
          email: owner.email,
          permissions: owner.permissions || [],
          propertyScopes: [],
          isSuperAdmin: false,
          subscriptionStatus: 'ACTIVE',
          sessionId: 'webhook',
        };

        const result = await activateSubscription(actor, {
          planId,
          cycle,
          paymentRef: paymentId,
        });

        await saveIdempotentResponse({
          key: idemKey,
          scope: 'webhook.razorpay',
          accountId,
          status: 200,
          body: {
            success: result.success,
            paymentId,
          },
        });
      }
    }
  }

  return new Response(JSON.stringify({ status: 'ok' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
