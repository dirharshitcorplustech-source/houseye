import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import { Payment } from '@/models';
import {
  getOwnerGatewayCredentials,
  ccavenueDecrypt,
} from '@/services/payments/owner-gateway';
import { finalizeGatewayPayment } from '@/services/billing/online-pay';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const encResp = String(form.get('encResp') || '');
  const paymentId = req.nextUrl.searchParams.get('paymentId') || '';
  const app = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!paymentId || !encResp) {
    return NextResponse.redirect(`${app}/tenant/bills?failed=1`);
  }

  await connectDB();
  const payment = await Payment.findById(paymentId).lean();
  if (!payment) {
    return NextResponse.redirect(`${app}/tenant/bills?failed=1`);
  }

  const creds = await getOwnerGatewayCredentials(payment.accountId.toString());
  if (!creds || creds.provider !== 'CCAVENUE') {
    return NextResponse.redirect(`${app}/tenant/bills?failed=1`);
  }

  let decoded = '';
  try {
    decoded = ccavenueDecrypt(encResp, creds.keySecret);
  } catch {
    return NextResponse.redirect(`${app}/tenant/bills?failed=1`);
  }

  const params = Object.fromEntries(
    decoded.split('&').map((p) => {
      const i = p.indexOf('=');
      return [p.slice(0, i), decodeURIComponent(p.slice(i + 1) || '')];
    })
  ) as Record<string, string>;

  const orderStatus = (params.order_status || '').toLowerCase();
  if (orderStatus !== 'success' && orderStatus !== 'successful') {
    return NextResponse.redirect(`${app}/tenant/bills?failed=1`);
  }

  const ref = params.tracking_id || params.bank_ref_no || params.order_id || paymentId;
  await finalizeGatewayPayment(paymentId, ref);
  return NextResponse.redirect(`${app}/tenant/bills?paid=1`);
}
