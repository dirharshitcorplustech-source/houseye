/**
 * HOUSEYE.COM — Per-owner Razorpay webhook
 * URL: /api/webhooks/owner-razorpay/{accountId}
 * Uses that account's encrypted webhook secret.
 */

import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import { Payment, User } from '@/models';
import {
  getOwnerGatewayCredentials,
  verifyOwnerWebhookSignature,
} from '@/services/payments/owner-gateway';
import { approvePayment } from '@/services/billing/approve-payment';
import {
  getIdempotentResponse,
  saveIdempotentResponse,
} from '@/lib/security/idempotency';
import { CurrentUser } from '@/lib/auth/get-session';

export async function POST(
  req: NextRequest,
  { params }: { params: { accountId: string } }
) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature') || '';

  const creds = await getOwnerGatewayCredentials(params.accountId);
  if (!creds?.webhookSecret) {
    return new Response(JSON.stringify({ error: 'Webhook not configured' }), {
      status: 400,
    });
  }

  if (
    !verifyOwnerWebhookSignature({
      webhookSecret: creds.webhookSecret,
      rawBody,
      signature,
    })
  ) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 400,
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
    };
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
    });
  }

  if (event.event === 'payment.captured') {
    const entity = event.payload?.payment?.entity;
    const paymentId = entity?.notes?.paymentId;
    const rzpPaymentId = entity?.id;

    if (paymentId && rzpPaymentId) {
      const idemKey = `owner_wh_${rzpPaymentId}`;
      const cached = await getIdempotentResponse(
        idemKey,
        'webhook.owner_razorpay'
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
        payment.gatewayRef = rzpPaymentId;
        payment.gatewayStatus = 'captured';
        payment.transactionRef = rzpPaymentId;
        payment.method = 'GATEWAY';
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
            sessionId: 'owner-webhook',
          };
          await approvePayment(actor, payment._id.toString());
        }
      }

      await saveIdempotentResponse({
        key: idemKey,
        scope: 'webhook.owner_razorpay',
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
