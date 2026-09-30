import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import { Payment } from '@/models';
import { getOwnerGatewayCredentials } from '@/services/payments/owner-gateway';
import { finalizeGatewayPayment } from '@/services/billing/online-pay';
import {
  getIdempotentResponse,
  saveIdempotentResponse,
} from '@/lib/security/idempotency';

export async function POST(
  req: NextRequest,
  { params }: { params: { accountId: string } }
) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const creds = await getOwnerGatewayCredentials(params.accountId);
  if (!creds || creds.provider !== 'CASHFREE') {
    return new Response(JSON.stringify({ error: 'Not configured' }), { status: 400 });
  }

  // Optional: verify x-webhook-signature with webhookSecret if set
  const orderId =
    body.data?.order?.order_id ||
    body.order?.order_id ||
    body.order_id;
  const orderStatus =
    body.data?.order?.order_status ||
    body.order?.order_status ||
    body.order_status;

  if (!orderId) {
    return new Response(JSON.stringify({ status: 'ignored' }), { status: 200 });
  }

  if (String(orderStatus).toUpperCase() !== 'PAID') {
    return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
  }

  const idemKey = `cf_${orderId}`;
  const cached = await getIdempotentResponse(idemKey, 'webhook.owner_cashfree');
  if (cached) {
    return new Response(JSON.stringify({ status: 'ok', cached: true }), {
      status: 200,
    });
  }

  await connectDB();
  const payment = await Payment.findOne({
    accountId: params.accountId,
    gatewayRef: orderId,
  }).exec();

  if (payment && payment.status !== 'APPROVED') {
    await finalizeGatewayPayment(payment._id.toString(), orderId);
  }

  await saveIdempotentResponse({
    key: idemKey,
    scope: 'webhook.owner_cashfree',
    accountId: params.accountId,
    status: 200,
    body: { success: true },
  });

  return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
}
