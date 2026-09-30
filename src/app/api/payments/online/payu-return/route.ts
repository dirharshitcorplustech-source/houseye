import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import { Payment } from '@/models';
import {
  getOwnerGatewayCredentials,
  verifyPayUReverseHash,
} from '@/services/payments/owner-gateway';
import { finalizeGatewayPayment } from '@/services/billing/online-pay';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const status = String(form.get('status') || '');
  const hash = String(form.get('hash') || '');
  const txnid = String(form.get('txnid') || '');
  const amount = String(form.get('amount') || '');
  const productinfo = String(form.get('productinfo') || '');
  const firstname = String(form.get('firstname') || '');
  const email = String(form.get('email') || '');
  const udf1 = String(form.get('udf1') || '');
  const mihpayid = String(form.get('mihpayid') || txnid);

  const paymentId =
    req.nextUrl.searchParams.get('paymentId') || udf1 || '';

  const app = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!paymentId) {
    return NextResponse.redirect(`${app}/tenant/bills?failed=1`);
  }

  await connectDB();
  const payment = await Payment.findById(paymentId).lean();
  if (!payment) {
    return NextResponse.redirect(`${app}/tenant/bills?failed=1`);
  }

  const creds = await getOwnerGatewayCredentials(payment.accountId.toString());
  if (!creds || creds.provider !== 'PAYU') {
    return NextResponse.redirect(`${app}/tenant/bills?failed=1`);
  }

  const ok = verifyPayUReverseHash({
    salt: creds.keySecret,
    status,
    email,
    firstname,
    productinfo,
    amount,
    txnid,
    key: creds.keyId,
    udf1,
    udf2: String(form.get('udf2') || ''),
    udf3: String(form.get('udf3') || ''),
    udf4: String(form.get('udf4') || ''),
    udf5: String(form.get('udf5') || ''),
    hash,
  });

  if (!ok || status.toLowerCase() !== 'success') {
    return NextResponse.redirect(`${app}/tenant/bills?failed=1`);
  }

  await finalizeGatewayPayment(paymentId, mihpayid);
  return NextResponse.redirect(`${app}/tenant/bills?paid=1`);
}

export async function GET(req: NextRequest) {
  // Some flows use GET
  return POST(req);
}
