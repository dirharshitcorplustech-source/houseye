/**
 * HOUSEYE.COM — Per-owner Stripe webhook
 * URL: /api/webhooks/owner-stripe/{accountId}
 * Configure endpoint + webhook signing secret in Owner gateway settings.
 */

import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { connectDB } from '@/lib/db/connect';
import { Payment, User } from '@/models';
import { getOwnerGatewayCredentials } from '@/services/payments/owner-gateway';
import { approvePayment } from '@/services/billing/approve-payment';
import {
  getIdempotentResponse,
  saveIdempotentResponse,
} from '@/lib/security/idempotency';
import { CurrentUser } from '@/lib/auth/get-session';

function verifyStripeSignature(
  rawBody: string,
  header: string,
  secret: string
): boolean {
  // Stripe-Signature: t=timestamp,v1=signature
  try {
    const parts = Object.fromEntries(
      header.split(',').map((p) => {
        const [k, v] = p.split('=');
        return [k.trim(), v];
      })
    );
    const t = parts.t;
    const v1 = parts.v1;
    if (!t || !v1) return false;
    const signed = `${t}.${rawBody}`;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(signed, 'utf8')
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
  } catch {
    return false;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { accountId: string } }
) {
  const rawBody = await req.text();
  const sig = req.headers.get('stripe-signature') || '';

  const creds = await getOwnerGatewayCredentials(params.accountId);
  if (!creds || creds.provider !== 'STRIPE') {
    return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
      status: 400,
    });
  }

  const whSecret = creds.webhookSecret;
  if (whSecret && !verifyStripeSignature(rawBody, sig, whSecret)) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 400,
    });
  }

  let event: {
    type?: string;
    data?: {
      object?: {
        id?: string;
        status?: string;
        metadata?: Record<string, string>;
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

  if (event.type === 'payment_intent.succeeded') {
    const obj = event.data?.object;
    const paymentId = obj?.metadata?.paymentId;
    const piId = obj?.id;

    if (paymentId && piId) {
      const idemKey = `owner_stripe_${piId}`;
      const cached = await getIdempotentResponse(
        idemKey,
        'webhook.owner_stripe'
      );
      if (cached) {
        return new Response(JSON.stringify({ status: 'ok', cached: true }), {
          status: 200,
        });
      }

      await connectDB();
      const payment = await Payment.findById(paymentId).exec();
      if (
        payment &&
        payment.accountId.toString() === params.accountId &&
        payment.status !== 'APPROVED'
      ) {
        payment.status = 'SUBMITTED';
        payment.method = 'GATEWAY';
        payment.gatewayRef = piId;
        payment.gatewayStatus = 'succeeded';
        payment.transactionRef = piId;
        await payment.save();

        const owner = await User.findOne({
          accountId: params.accountId,
          role: 'OWNER',
          status: 'ACTIVE',
        }).exec();

        if (owner) {
          const actor: CurrentUser = {
            id: owner._id.toString(),
            accountId: params.accountId,
            role: 'OWNER',
            username: owner.username,
            fullName: owner.fullName,
            email: owner.email,
            permissions: [],
            propertyScopes: [],
            isSuperAdmin: false,
            subscriptionStatus: 'ACTIVE',
            sessionId: 'stripe-webhook',
          };
          await approvePayment(actor, payment._id.toString());
        }
      }

      await saveIdempotentResponse({
        key: idemKey,
        scope: 'webhook.owner_stripe',
        accountId: params.accountId,
        status: 200,
        body: { success: true },
      });
    }
  }

  return new Response(JSON.stringify({ status: 'ok' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
