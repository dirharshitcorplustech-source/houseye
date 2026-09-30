/**
 * HOUSEYE.COM — Tenant online pay via Owner's gateway
 * Money goes to Owner's merchant account — NOT Houseye.
 */

import { connectDB } from '@/lib/db/connect';
import { Bill, Payment } from '@/models';
import { CurrentUser } from '@/lib/auth/get-session';
import {
  createOwnerRazorpayOrder,
  createOwnerStripePaymentIntent,
  createOwnerStripeCheckoutSession,
  createOwnerPayUPayment,
  createOwnerCashfreeOrder,
  createOwnerCCAvenuePayment,
  fetchCashfreeOrderStatus,
  verifyPayUReverseHash,
  ccavenueDecrypt,
  getOwnerGatewayCredentials,
  verifyOwnerRazorpayPayment,
} from '@/services/payments/owner-gateway';
import { approvePayment } from '@/services/billing/approve-payment';
import { nanoid } from 'nanoid';
import mongoose from 'mongoose';

export async function startTenantOnlinePayment(
  actor: CurrentUser,
  input: { billId: string; amount?: number }
): Promise<
  | {
      success: true;
      provider: 'RAZORPAY' | 'STRIPE' | 'PAYU' | 'CASHFREE' | 'CCAVENUE';
      paymentId: string;
      amount: number;
      currency: string;
      orderId?: string;
      keyId?: string;
      clientSecret?: string;
      publishableKey?: string;
      paymentIntentId?: string;
      checkoutUrl?: string;
      sessionId?: string;
      payuActionUrl?: string;
      payuFields?: Record<string, string>;
      cashfreePaymentSessionId?: string;
      cashfreeMode?: 'test' | 'live';
      ccavenueActionUrl?: string;
      ccavenueAccessCode?: string;
      ccavenueEncRequest?: string;
    }
  | { success: false; code: string; message: string }
> {
  await connectDB();
  const bill = await Bill.findById(input.billId).exec();
  if (!bill) {
    return { success: false, code: 'NOT_FOUND', message: 'Bill not found' };
  }

  if (actor.role === 'TENANT') {
    if (bill.tenantUserId?.toString() !== actor.id) {
      return { success: false, code: 'FORBIDDEN', message: 'Access denied' };
    }
  }

  if (bill.status === 'PAID' || bill.status === 'CANCELLED') {
    return {
      success: false,
      code: 'CONFLICT',
      message: 'Bill cannot accept payment',
    };
  }

  if (!bill.paymentLinkActive) {
    return {
      success: false,
      code: 'CONFLICT',
      message: 'Payment link is inactive',
    };
  }

  const amount =
    input.amount && input.amount > 0
      ? input.amount
      : bill.totalRemaining;

  if (amount > bill.totalRemaining + 0.001) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Amount exceeds remaining balance',
    };
  }

  const creds = await getOwnerGatewayCredentials(bill.accountId.toString());
  if (!creds) {
    return {
      success: false,
      code: 'GATEWAY_DISABLED',
      message:
        'Online payment is not available. Please submit manual payment proof.',
    };
  }

  if (!creds.allowPartialOnline && amount < bill.totalRemaining) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Partial online payment is not allowed. Pay full amount.',
    };
  }

  // Pending payment record
  const payment = await Payment.create({
    accountId: bill.accountId,
    propertyId: bill.propertyId,
    unitId: bill.unitId,
    tenancyId: bill.tenancyId,
    billId: bill._id,
    tenantUserId: bill.tenantUserId,
    amount,
    method: 'GATEWAY',
    status: 'PENDING',
    createdBy: actor.id,
  });

  const amountPaise = Math.round(amount * 100);
  const meta = {
    billId: bill._id.toString(),
    paymentId: payment._id.toString(),
    tenancyId: bill.tenancyId.toString(),
  };

  if (creds.provider === 'STRIPE') {
    const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const session = await createOwnerStripeCheckoutSession({
      accountId: bill.accountId.toString(),
      amountPaise,
      metadata: meta,
      successUrl: `${base}/tenant/bills?paid=1&paymentId=${payment._id.toString()}`,
      cancelUrl: `${base}/tenant/bills?cancelled=1`,
    });
    if (!session.success) {
      payment.status = 'FAILED';
      await payment.save();
      return {
        success: false,
        code: 'GATEWAY_ERROR',
        message: session.message,
      };
    }
    payment.gatewayRef = session.sessionId;
    payment.gatewayStatus = 'checkout_session';
    await payment.save();
    return {
      success: true,
      provider: 'STRIPE' as const,
      checkoutUrl: session.url,
      sessionId: session.sessionId,
      amount: amountPaise,
      currency: 'INR',
      paymentId: payment._id.toString(),
    };
  }

  if (creds.provider === 'PAYU') {
    const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const txnid = `hy${payment._id.toString().slice(-12)}`;
    const payu = await createOwnerPayUPayment({
      accountId: bill.accountId.toString(),
      amountInr: amount,
      txnid,
      productinfo: `Bill ${bill.billNumber}`,
      firstname: actor.fullName || 'Tenant',
      email: actor.email || 'tenant@houseye.local',
      successUrl: `${base}/api/payments/online/payu-return?paymentId=${payment._id.toString()}`,
      failureUrl: `${base}/tenant/bills?failed=1`,
      udf1: payment._id.toString(),
      udf2: bill._id.toString(),
    });
    if (!payu.success) {
      payment.status = 'FAILED';
      await payment.save();
      return { success: false, code: 'GATEWAY_ERROR', message: payu.message };
    }
    payment.gatewayRef = txnid;
    payment.gatewayStatus = 'payu_initiated';
    await payment.save();
    return {
      success: true,
      provider: 'PAYU' as const,
      payuActionUrl: payu.actionUrl,
      payuFields: payu.fields,
      amount: amountPaise,
      currency: 'INR',
      paymentId: payment._id.toString(),
    };
  }

  if (creds.provider === 'CASHFREE') {
    const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const orderId = `cf_${payment._id.toString()}`;
    const cf = await createOwnerCashfreeOrder({
      accountId: bill.accountId.toString(),
      amountInr: amount,
      orderId,
      customerId: actor.id.slice(-40),
      customerEmail: actor.email,
      returnUrl: `${base}/tenant/bills?paid=1&paymentId=${payment._id.toString()}&orderId={order_id}`,
      notifyUrl: `${base}/api/webhooks/owner-cashfree/${bill.accountId.toString()}`,
    });
    if (!cf.success) {
      payment.status = 'FAILED';
      await payment.save();
      return { success: false, code: 'GATEWAY_ERROR', message: cf.message };
    }
    payment.gatewayRef = cf.orderId;
    payment.gatewayStatus = 'cf_order_created';
    await payment.save();
    return {
      success: true,
      provider: 'CASHFREE' as const,
      cashfreePaymentSessionId: cf.paymentSessionId,
      cashfreeMode: (await getOwnerGatewayCredentials(bill.accountId.toString()))?.mode || 'test',
      amount: amountPaise,
      currency: 'INR',
      paymentId: payment._id.toString(),
      orderId: cf.orderId,
    };
  }

  if (creds.provider === 'CCAVENUE') {
    const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const orderId = payment._id.toString().slice(-20);
    const cca = await createOwnerCCAvenuePayment({
      accountId: bill.accountId.toString(),
      amountInr: amount,
      orderId,
      redirectUrl: `${base}/api/payments/online/ccavenue-return?paymentId=${payment._id.toString()}`,
      cancelUrl: `${base}/tenant/bills?cancelled=1`,
      billingName: actor.fullName,
      billingEmail: actor.email,
    });
    if (!cca.success) {
      payment.status = 'FAILED';
      await payment.save();
      return { success: false, code: 'GATEWAY_ERROR', message: cca.message };
    }
    payment.gatewayRef = orderId;
    payment.gatewayStatus = 'ccavenue_initiated';
    await payment.save();
    return {
      success: true,
      provider: 'CCAVENUE' as const,
      ccavenueActionUrl: cca.actionUrl,
      ccavenueAccessCode: cca.accessCode,
      ccavenueEncRequest: cca.encRequest,
      amount: amountPaise,
      currency: 'INR',
      paymentId: payment._id.toString(),
    };
  }

  const order = await createOwnerRazorpayOrder({
    accountId: bill.accountId.toString(),
    amountPaise,
    receipt: `bill_${payment._id.toString().slice(-10)}`,
    notes: meta,
  });

  if (!order.success) {
    payment.status = 'FAILED';
    await payment.save();
    return {
      success: false,
      code: 'GATEWAY_ERROR',
      message: order.message,
    };
  }

  payment.gatewayRef = order.orderId;
  payment.gatewayStatus = 'order_created';
  await payment.save();

  return {
    success: true,
    provider: 'RAZORPAY' as const,
    orderId: order.orderId,
    amount: order.amount,
    currency: order.currency,
    keyId: order.keyId,
    paymentId: payment._id.toString(),
  };
}

/**
 * After Razorpay checkout success — verify with Owner's secret, then auto-approve
 * (gateway success = verified money to Owner; no manual proof needed)
 */
export async function confirmTenantOnlinePayment(
  actor: CurrentUser,
  input: {
    paymentId: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }
): Promise<
  | { success: true; payment: Record<string, unknown>; bill: Record<string, unknown> }
  | { success: false; code: string; message: string }
> {
  await connectDB();
  const payment = await Payment.findById(input.paymentId).exec();
  if (!payment) {
    return { success: false, code: 'NOT_FOUND', message: 'Payment not found' };
  }

  if (actor.role === 'TENANT' && payment.tenantUserId?.toString() !== actor.id) {
    return { success: false, code: 'FORBIDDEN', message: 'Access denied' };
  }

  if (payment.status === 'APPROVED') {
    return {
      success: true,
      payment: { id: payment._id.toString(), status: payment.status },
      bill: {},
    };
  }

  const creds = await getOwnerGatewayCredentials(payment.accountId.toString());
  if (!creds || creds.provider !== 'RAZORPAY') {
    return {
      success: false,
      code: 'GATEWAY_DISABLED',
      message: 'Gateway not available',
    };
  }

  const valid = verifyOwnerRazorpayPayment({
    keySecret: creds.keySecret,
    orderId: input.razorpay_order_id,
    paymentId: input.razorpay_payment_id,
    signature: input.razorpay_signature,
  });

  if (!valid) {
    payment.status = 'FAILED';
    payment.gatewayStatus = 'signature_invalid';
    await payment.save();
    return {
      success: false,
      code: 'INVALID_SIGNATURE',
      message: 'Payment verification failed',
    };
  }

  payment.gatewayRef = input.razorpay_payment_id;
  payment.gatewayStatus = 'captured';
  payment.transactionRef = input.razorpay_payment_id;
  payment.status = 'SUBMITTED'; // approvePayment expects SUBMITTED
  await payment.save();

  // System auto-approve as Owner context (gateway verified)
  // Use a synthetic owner-level approve via service — need Owner actor
  const { User } = await import('@/models');
  const owner = await User.findOne({
    accountId: payment.accountId,
    role: 'OWNER',
    status: 'ACTIVE',
  }).exec();

  if (!owner) {
    return {
      success: false,
      code: 'SERVER_ERROR',
      message: 'Owner account not found for approval',
    };
  }

  const ownerActor: CurrentUser = {
    id: owner._id.toString(),
    accountId: payment.accountId.toString(),
    role: 'OWNER',
    username: owner.username,
    fullName: owner.fullName,
    email: owner.email,
    permissions: [],
    propertyScopes: [],
    isSuperAdmin: false,
    subscriptionStatus: 'ACTIVE',
    sessionId: 'gateway-auto',
  };

  const result = await approvePayment(ownerActor, payment._id.toString());
  if (!result.success) {
    return {
      success: false,
      code: result.code,
      message: result.message,
    };
  }

  return {
    success: true,
    payment: result.payment,
    bill: result.bill,
  };
}


/**
 * Confirm Stripe success (client secret flow completed)
 * Verifies PaymentIntent status with Owner secret key, then auto-approve.
 */
export async function confirmTenantStripePayment(
  actor: CurrentUser,
  input: {
    paymentId: string;
    paymentIntentId: string;
  }
): Promise<
  | { success: true; payment: Record<string, unknown>; bill: Record<string, unknown> }
  | { success: false; code: string; message: string }
> {
  await connectDB();
  const payment = await Payment.findById(input.paymentId).exec();
  if (!payment) {
    return { success: false, code: 'NOT_FOUND', message: 'Payment not found' };
  }

  if (actor.role === 'TENANT' && payment.tenantUserId?.toString() !== actor.id) {
    return { success: false, code: 'FORBIDDEN', message: 'Access denied' };
  }

  if (payment.status === 'APPROVED') {
    return {
      success: true,
      payment: { id: payment._id.toString(), status: payment.status },
      bill: {},
    };
  }

  const creds = await getOwnerGatewayCredentials(payment.accountId.toString());
  if (!creds || creds.provider !== 'STRIPE') {
    return {
      success: false,
      code: 'GATEWAY_DISABLED',
      message: 'Stripe not available',
    };
  }

  const res = await fetch(
    `https://api.stripe.com/v1/payment_intents/${input.paymentIntentId}`,
    {
      headers: { Authorization: `Bearer ${creds.keySecret}` },
    }
  );
  if (!res.ok) {
    return {
      success: false,
      code: 'GATEWAY_ERROR',
      message: 'Could not verify Stripe payment',
    };
  }

  const pi = (await res.json()) as {
    id: string;
    status: string;
    amount: number;
    metadata?: Record<string, string>;
  };

  if (pi.status !== 'succeeded') {
    payment.gatewayStatus = pi.status;
    await payment.save();
    return {
      success: false,
      code: 'PAYMENT_INCOMPLETE',
      message: `Payment status: ${pi.status}`,
    };
  }

  if (
    pi.metadata?.paymentId &&
    pi.metadata.paymentId !== payment._id.toString()
  ) {
    return {
      success: false,
      code: 'INVALID_SIGNATURE',
      message: 'Payment metadata mismatch',
    };
  }

  payment.gatewayRef = pi.id;
  payment.gatewayStatus = 'succeeded';
  payment.transactionRef = pi.id;
  payment.status = 'SUBMITTED';
  payment.method = 'GATEWAY';
  await payment.save();

  const { User } = await import('@/models');
  const owner = await User.findOne({
    accountId: payment.accountId,
    role: 'OWNER',
    status: 'ACTIVE',
  }).exec();

  if (!owner) {
    return {
      success: false,
      code: 'SERVER_ERROR',
      message: 'Owner not found for approval',
    };
  }

  const ownerActor: CurrentUser = {
    id: owner._id.toString(),
    accountId: payment.accountId.toString(),
    role: 'OWNER',
    username: owner.username,
    fullName: owner.fullName,
    email: owner.email,
    permissions: [],
    propertyScopes: [],
    isSuperAdmin: false,
    subscriptionStatus: 'ACTIVE',
    sessionId: 'stripe-auto',
  };

  const result = await approvePayment(ownerActor, payment._id.toString());
  if (!result.success) {
    return {
      success: false,
      code: result.code,
      message: result.message,
    };
  }

  return {
    success: true,
    payment: result.payment,
    bill: result.bill,
  };
}


/** Shared: mark SUBMITTED and owner-approve after gateway success */
export async function finalizeGatewayPayment(
  paymentId: string,
  gatewayPaymentRef: string
): Promise<
  | { success: true; payment: Record<string, unknown>; bill: Record<string, unknown> }
  | { success: false; code: string; message: string }
> {
  await connectDB();
  const payment = await Payment.findById(paymentId).exec();
  if (!payment) {
    return { success: false, code: 'NOT_FOUND', message: 'Payment not found' };
  }
  if (payment.status === 'APPROVED') {
    return {
      success: true,
      payment: { id: payment._id.toString(), status: payment.status },
      bill: {},
    };
  }

  payment.status = 'SUBMITTED';
  payment.method = 'GATEWAY';
  payment.gatewayRef = gatewayPaymentRef;
  payment.gatewayStatus = 'captured';
  payment.transactionRef = gatewayPaymentRef;
  await payment.save();

  const { User } = await import('@/models');
  const owner = await User.findOne({
    accountId: payment.accountId,
    role: 'OWNER',
    status: 'ACTIVE',
  }).exec();

  if (!owner) {
    return { success: false, code: 'SERVER_ERROR', message: 'Owner not found' };
  }

  const ownerActor: CurrentUser = {
    id: owner._id.toString(),
    accountId: payment.accountId.toString(),
    role: 'OWNER',
    username: owner.username,
    fullName: owner.fullName,
    email: owner.email,
    permissions: [],
    propertyScopes: [],
    isSuperAdmin: false,
    subscriptionStatus: 'ACTIVE',
    sessionId: 'gateway-auto',
  };

  const result = await approvePayment(ownerActor, payment._id.toString());
  if (!result.success) {
    return { success: false, code: result.code, message: result.message };
  }
  return { success: true, payment: result.payment, bill: result.bill };
}
