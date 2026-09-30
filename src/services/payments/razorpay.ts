/**
 * HOUSEYE.COM — Razorpay integration
 * Orders for subscription; webhook signature verification.
 */

import crypto from 'crypto';
import { getOptionalEnv, isProductionLike } from '@/lib/config/env';

export function isRazorpayConfigured(): boolean {
  return !!(
    process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
  );
}

function authHeader(): string {
  const id = process.env.RAZORPAY_KEY_ID!;
  const secret = process.env.RAZORPAY_KEY_SECRET!;
  return 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64');
}

export interface CreateSubscriptionOrderInput {
  accountId: string;
  planId: string;
  cycle: 'monthly' | 'annual';
  amountPaise: number; // INR paise
  receipt: string;
  notes?: Record<string, string>;
}

export async function createRazorpayOrder(
  input: CreateSubscriptionOrderInput
): Promise<
  | { success: true; orderId: string; amount: number; currency: string; keyId: string }
  | { success: false; message: string }
> {
  if (!isRazorpayConfigured()) {
    return {
      success: false,
      message: 'Razorpay is not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)',
    };
  }

  if (input.amountPaise < 100) {
    return { success: false, message: 'Invalid amount' };
  }

  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: 'INR',
      receipt: input.receipt,
      notes: {
        accountId: input.accountId,
        planId: input.planId,
        cycle: input.cycle,
        purpose: 'houseye_subscription',
        ...input.notes,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('[Houseye] Razorpay order failed', text);
    return { success: false, message: 'Failed to create payment order' };
  }

  const data = (await res.json()) as {
    id: string;
    amount: number;
    currency: string;
  };

  return {
    success: true,
    orderId: data.id,
    amount: data.amount,
    currency: data.currency,
    keyId: process.env.RAZORPAY_KEY_ID!,
  };
}

/**
 * Verify webhook / payment signature
 * https://razorpay.com/docs/webhooks/validate-test/
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  const secret =
    process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}

/** Checkout payment verification (order_id|payment_id) */
export function verifyRazorpayPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;

  const payload = `${params.orderId}|${params.paymentId}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(params.signature)
    );
  } catch {
    return false;
  }
}

export function assertGatewayReadyForProduction(): void {
  if (isProductionLike() && !isRazorpayConfigured()) {
    console.warn(
      '[Houseye] PRODUCTION: Razorpay not configured — subscription payments will fail'
    );
  }
}
