/**
 * HOUSEYE.COM — Owner's own gateway (tenant collections only)
 */

import { connectDB } from '@/lib/db/connect';
import { AccountGateway } from '@/models';
import { CurrentUser } from '@/lib/auth/get-session';
import { isOwner, isSuperAdmin } from '@/services/authorization';
import {
  encryptSecret,
  decryptSecret,
  maskSecret,
} from '@/lib/security/encrypt';
import crypto from 'crypto';
import mongoose from 'mongoose';

export async function getOwnerGatewayPublic(accountId: string) {
  await connectDB();
  const g = await AccountGateway.findOne({ accountId }).lean();
  if (!g) {
    return {
      provider: 'NONE' as const,
      enabled: false,
      mode: 'test' as const,
      allowOnlineRent: true,
      allowPartialOnline: true,
      keyIdMasked: null,
      verifiedAt: null,
    };
  }
  return {
    provider: g.provider,
    enabled: g.enabled,
    mode: g.mode,
    allowOnlineRent: g.allowOnlineRent,
    allowPartialOnline: g.allowPartialOnline,
    keyIdMasked: g.keyIdLast4 ? `****${g.keyIdLast4}` : null,
    verifiedAt: g.verifiedAt,
    lastError: g.lastError,
  };
}

export async function saveOwnerGateway(
  actor: CurrentUser,
  input: {
    provider: 'RAZORPAY' | 'STRIPE' | 'PAYU' | 'CASHFREE' | 'CCAVENUE' | 'NONE';
    keyId?: string;
    keySecret?: string;
    webhookSecret?: string;
    mode?: 'test' | 'live';
    enabled?: boolean;
    allowOnlineRent?: boolean;
    allowPartialOnline?: boolean;
  }
): Promise<
  | { success: true; gateway: Awaited<ReturnType<typeof getOwnerGatewayPublic>> }
  | { success: false; code: string; message: string }
> {
  if (!isOwner(actor) && !isSuperAdmin(actor)) {
    return {
      success: false,
      code: 'FORBIDDEN',
      message: 'Only the Owner can configure payment gateway',
    };
  }
  if (!actor.accountId) {
    return { success: false, code: 'FORBIDDEN', message: 'No account context' };
  }

  if (input.provider === 'NONE') {
    await connectDB();
    await AccountGateway.findOneAndUpdate(
      { accountId: actor.accountId },
      {
        provider: 'NONE',
        enabled: false,
        updatedBy: actor.id,
      },
      { upsert: true }
    );
    return {
      success: true,
      gateway: await getOwnerGatewayPublic(actor.accountId),
    };
  }

  await connectDB();
  const existing = await AccountGateway.findOne({ accountId: actor.accountId })
    .select('+keyIdEnc +keySecretEnc +webhookSecretEnc')
    .exec();

  const update: Record<string, unknown> = {
    provider: input.provider,
    mode: input.mode || 'test',
    enabled: input.enabled !== false,
    allowOnlineRent: input.allowOnlineRent !== false,
    allowPartialOnline: input.allowPartialOnline !== false,
    updatedBy: new mongoose.Types.ObjectId(actor.id),
    lastError: undefined,
  };

  if (input.keyId?.trim()) {
    update.keyIdEnc = encryptSecret(input.keyId.trim());
    update.keyIdLast4 = input.keyId.trim().slice(-4);
  } else if (!existing?.keyIdEnc) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Gateway Key ID is required',
    };
  }

  if (input.keySecret?.trim()) {
    update.keySecretEnc = encryptSecret(input.keySecret.trim());
  } else if (!existing?.keySecretEnc) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Gateway Key Secret is required',
    };
  }

  if (input.webhookSecret?.trim()) {
    update.webhookSecretEnc = encryptSecret(input.webhookSecret.trim());
  }

  await AccountGateway.findOneAndUpdate(
    { accountId: actor.accountId },
    { $set: update },
    { upsert: true }
  );

  return {
    success: true,
    gateway: await getOwnerGatewayPublic(actor.accountId),
  };
}

/** Load decrypted credentials for server-side charge (never expose to client) */
export async function getOwnerGatewayCredentials(accountId: string): Promise<
  | {
      provider: 'RAZORPAY' | 'STRIPE' | 'PAYU' | 'CASHFREE' | 'CCAVENUE';
      keyId: string;
      keySecret: string;
      webhookSecret?: string;
      mode: 'test' | 'live';
      allowOnlineRent: boolean;
      allowPartialOnline: boolean;
    }
  | null
> {
  await connectDB();
  const g = await AccountGateway.findOne({
    accountId,
    enabled: true,
    provider: { $in: ['RAZORPAY', 'STRIPE', 'PAYU', 'CASHFREE', 'CCAVENUE'] },
  })
    .select('+keyIdEnc +keySecretEnc +webhookSecretEnc')
    .exec();

  if (!g?.keyIdEnc || !g?.keySecretEnc) return null;

  try {
    return {
      provider: g.provider as 'RAZORPAY' | 'STRIPE' | 'PAYU' | 'CASHFREE' | 'CCAVENUE',
      keyId: decryptSecret(g.keyIdEnc),
      keySecret: decryptSecret(g.keySecretEnc),
      webhookSecret: g.webhookSecretEnc
        ? decryptSecret(g.webhookSecretEnc)
        : undefined,
      mode: g.mode,
      allowOnlineRent: g.allowOnlineRent,
      allowPartialOnline: g.allowPartialOnline,
    };
  } catch {
    return null;
  }
}

export async function createOwnerRazorpayOrder(input: {
  accountId: string;
  amountPaise: number;
  receipt: string;
  notes: Record<string, string>;
}): Promise<
  | { success: true; orderId: string; amount: number; currency: string; keyId: string }
  | { success: false; message: string }
> {
  const creds = await getOwnerGatewayCredentials(input.accountId);
  if (!creds || creds.provider !== 'RAZORPAY') {
    return {
      success: false,
      message:
        'Owner has not enabled an online payment gateway. Use manual payment proof instead.',
    };
  }

  if (!creds.allowOnlineRent) {
    return {
      success: false,
      message: 'Online rent collection is disabled by the property owner',
    };
  }

  const auth =
    'Basic ' +
    Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString('base64');

  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: 'INR',
      receipt: input.receipt,
      notes: {
        ...input.notes,
        houseye_purpose: 'tenant_bill',
        houseye_account_id: input.accountId,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('[Houseye] Owner Razorpay order failed', text);
    await AccountGateway.updateOne(
      { accountId: input.accountId },
      { lastError: 'Order create failed' }
    );
    return { success: false, message: 'Could not create payment order' };
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
    keyId: creds.keyId,
  };
}

export function verifyOwnerRazorpayPayment(params: {
  keySecret: string;
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const payload = `${params.orderId}|${params.paymentId}`;
  const expected = crypto
    .createHmac('sha256', params.keySecret)
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

export function verifyOwnerWebhookSignature(params: {
  webhookSecret: string;
  rawBody: string;
  signature: string;
}): boolean {
  const expected = crypto
    .createHmac('sha256', params.webhookSecret)
    .update(params.rawBody)
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


export async function createOwnerStripePaymentIntent(input: {
  accountId: string;
  amountPaise: number;
  metadata: Record<string, string>;
}): Promise<
  | { success: true; clientSecret: string; paymentIntentId: string; publishableKey: string }
  | { success: false; message: string }
> {
  const creds = await getOwnerGatewayCredentials(input.accountId);
  if (!creds || creds.provider !== 'STRIPE') {
    return { success: false, message: 'Stripe is not enabled for this owner' };
  }
  if (!creds.allowOnlineRent) {
    return { success: false, message: 'Online rent collection is disabled' };
  }

  // keyId = publishable key, keySecret = secret key
  const res = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.keySecret}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      amount: String(input.amountPaise),
      currency: 'inr',
      'metadata[houseye_account_id]': input.accountId,
      ...Object.fromEntries(
        Object.entries(input.metadata).map(([k, v]) => [`metadata[${k}]`, v])
      ),
    }),
  });

  if (!res.ok) {
    console.error('[Houseye] Stripe PI failed', await res.text());
    return { success: false, message: 'Could not create Stripe payment' };
  }

  const data = (await res.json()) as {
    id: string;
    client_secret: string;
  };

  return {
    success: true,
    clientSecret: data.client_secret,
    paymentIntentId: data.id,
    publishableKey: creds.keyId,
  };
}


export async function createOwnerStripeCheckoutSession(input: {
  accountId: string;
  amountPaise: number;
  metadata: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
}): Promise<
  | { success: true; sessionId: string; url: string }
  | { success: false; message: string }
> {
  const creds = await getOwnerGatewayCredentials(input.accountId);
  if (!creds || creds.provider !== 'STRIPE') {
    return { success: false, message: 'Stripe is not enabled for this owner' };
  }
  if (!creds.allowOnlineRent) {
    return { success: false, message: 'Online rent collection is disabled' };
  }

  const params = new URLSearchParams();
  params.set('mode', 'payment');
  params.set('success_url', input.successUrl);
  params.set('cancel_url', input.cancelUrl);
  params.set('line_items[0][price_data][currency]', 'inr');
  params.set('line_items[0][price_data][product_data][name]', 'Property bill payment');
  params.set('line_items[0][price_data][unit_amount]', String(input.amountPaise));
  params.set('line_items[0][quantity]', '1');
  for (const [k, v] of Object.entries(input.metadata)) {
    params.set(`metadata[${k}]`, v);
  }
  params.set('payment_intent_data[metadata][paymentId]', input.metadata.paymentId || '');
  params.set('payment_intent_data[metadata][billId]', input.metadata.billId || '');
  params.set('payment_intent_data[metadata][houseye_account_id]', input.accountId);

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.keySecret}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  if (!res.ok) {
    console.error('[Houseye] Stripe Checkout failed', await res.text());
    return { success: false, message: 'Could not create Stripe Checkout session' };
  }

  const data = (await res.json()) as { id: string; url: string };
  return { success: true, sessionId: data.id, url: data.url };
}


// ─── PayU (Owner keys: keyId = merchant key, keySecret = salt) ───


function payuBase(mode: 'test' | 'live') {
  return mode === 'live'
    ? 'https://secure.payu.in'
    : 'https://test.payu.in';
}

export function buildPayUHash(params: {
  key: string;
  salt: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
}): string {
  const udf1 = params.udf1 || '';
  const udf2 = params.udf2 || '';
  const udf3 = params.udf3 || '';
  const udf4 = params.udf4 || '';
  const udf5 = params.udf5 || '';
  const seq = `${params.key}|${params.txnid}|${params.amount}|${params.productinfo}|${params.firstname}|${params.email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${params.salt}`;
  return crypto.createHash('sha512').update(seq).digest('hex');
}

export function verifyPayUReverseHash(params: {
  salt: string;
  status: string;
  email: string;
  firstname: string;
  productinfo: string;
  amount: string;
  txnid: string;
  key: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
  hash: string;
}): boolean {
  const udf1 = params.udf1 || '';
  const udf2 = params.udf2 || '';
  const udf3 = params.udf3 || '';
  const udf4 = params.udf4 || '';
  const udf5 = params.udf5 || '';
  // reverse: salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
  const seq = `${params.salt}|${params.status}||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${params.email}|${params.firstname}|${params.productinfo}|${params.amount}|${params.txnid}|${params.key}`;
  const expected = crypto.createHash('sha512').update(seq).digest('hex');
  return expected.toLowerCase() === (params.hash || '').toLowerCase();
}

export async function createOwnerPayUPayment(input: {
  accountId: string;
  amountInr: number;
  txnid: string;
  productinfo: string;
  firstname: string;
  email: string;
  successUrl: string;
  failureUrl: string;
  udf1?: string;
  udf2?: string;
}): Promise<
  | {
      success: true;
      actionUrl: string;
      fields: Record<string, string>;
    }
  | { success: false; message: string }
> {
  const creds = await getOwnerGatewayCredentials(input.accountId);
  if (!creds || creds.provider !== 'PAYU') {
    return { success: false, message: 'PayU is not enabled for this owner' };
  }
  if (!creds.allowOnlineRent) {
    return { success: false, message: 'Online rent collection is disabled' };
  }

  const amount = input.amountInr.toFixed(2);
  const hash = buildPayUHash({
    key: creds.keyId,
    salt: creds.keySecret,
    txnid: input.txnid,
    amount,
    productinfo: input.productinfo,
    firstname: input.firstname,
    email: input.email,
    udf1: input.udf1,
    udf2: input.udf2,
  });

  const fields: Record<string, string> = {
    key: creds.keyId,
    txnid: input.txnid,
    amount,
    productinfo: input.productinfo,
    firstname: input.firstname,
    email: input.email,
    phone: '9999999999',
    surl: input.successUrl,
    furl: input.failureUrl,
    hash,
    service_provider: 'payu_paisa',
  };
  if (input.udf1) fields.udf1 = input.udf1;
  if (input.udf2) fields.udf2 = input.udf2;

  return {
    success: true,
    actionUrl: `${payuBase(creds.mode)}/_payment`,
    fields,
  };
}

// ─── Cashfree (keyId = appId / clientId, keySecret = secretKey) ───

function cashfreeBase(mode: 'test' | 'live') {
  return mode === 'live'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';
}

export async function createOwnerCashfreeOrder(input: {
  accountId: string;
  amountInr: number;
  orderId: string;
  customerId: string;
  customerPhone?: string;
  customerEmail?: string;
  returnUrl: string;
  notifyUrl?: string;
}): Promise<
  | {
      success: true;
      orderId: string;
      paymentSessionId: string;
      orderToken?: string;
    }
  | { success: false; message: string }
> {
  const creds = await getOwnerGatewayCredentials(input.accountId);
  if (!creds || creds.provider !== 'CASHFREE') {
    return { success: false, message: 'Cashfree is not enabled for this owner' };
  }
  if (!creds.allowOnlineRent) {
    return { success: false, message: 'Online rent collection is disabled' };
  }

  const res = await fetch(`${cashfreeBase(creds.mode)}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': creds.keyId,
      'x-client-secret': creds.keySecret,
      'x-api-version': '2023-08-01',
    },
    body: JSON.stringify({
      order_id: input.orderId,
      order_amount: Number(input.amountInr.toFixed(2)),
      order_currency: 'INR',
      customer_details: {
        customer_id: input.customerId,
        customer_phone: input.customerPhone || '9999999999',
        customer_email: input.customerEmail || 'tenant@houseye.local',
      },
      order_meta: {
        return_url: input.returnUrl,
        notify_url: input.notifyUrl,
      },
    }),
  });

  if (!res.ok) {
    console.error('[Houseye] Cashfree order failed', await res.text());
    return { success: false, message: 'Could not create Cashfree order' };
  }

  const data = (await res.json()) as {
    order_id: string;
    payment_session_id: string;
    order_token?: string;
  };

  return {
    success: true,
    orderId: data.order_id,
    paymentSessionId: data.payment_session_id,
    orderToken: data.order_token,
  };
}

export async function fetchCashfreeOrderStatus(input: {
  accountId: string;
  orderId: string;
}): Promise<{ orderStatus?: string; raw?: unknown } | null> {
  const creds = await getOwnerGatewayCredentials(input.accountId);
  if (!creds || creds.provider !== 'CASHFREE') return null;

  const res = await fetch(
    `${cashfreeBase(creds.mode)}/orders/${input.orderId}`,
    {
      headers: {
        'x-client-id': creds.keyId,
        'x-client-secret': creds.keySecret,
        'x-api-version': '2023-08-01',
      },
    }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { order_status?: string };
  return { orderStatus: data.order_status, raw: data };
}

// ─── CCAvenue (keyId = merchant_id, keySecret = working_key, webhookSecret = access_code) ───

function ccavenueEncrypt(plain: string, workingKey: string): string {
  const key = crypto.createHash('md5').update(workingKey).digest();
  const iv = Buffer.from([
    0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b,
    0x0c, 0x0d, 0x0e, 0x0f,
  ]);
  const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
  let enc = cipher.update(plain, 'utf8', 'hex');
  enc += cipher.final('hex');
  return enc;
}

export function ccavenueDecrypt(encHex: string, workingKey: string): string {
  const key = crypto.createHash('md5').update(workingKey).digest();
  const iv = Buffer.from([
    0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b,
    0x0c, 0x0d, 0x0e, 0x0f,
  ]);
  const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
  let dec = decipher.update(encHex, 'hex', 'utf8');
  dec += decipher.final('utf8');
  return dec;
}

function ccavenueBase(mode: 'test' | 'live') {
  return mode === 'live'
    ? 'https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction'
    : 'https://test.ccavenue.com/transaction/transaction.do?command=initiateTransaction';
}

export async function createOwnerCCAvenuePayment(input: {
  accountId: string;
  amountInr: number;
  orderId: string;
  redirectUrl: string;
  cancelUrl: string;
  billingName?: string;
  billingEmail?: string;
}): Promise<
  | {
      success: true;
      actionUrl: string;
      accessCode: string;
      encRequest: string;
    }
  | { success: false; message: string }
> {
  const creds = await getOwnerGatewayCredentials(input.accountId);
  if (!creds || creds.provider !== 'CCAVENUE') {
    return { success: false, message: 'CCAvenue is not enabled for this owner' };
  }
  if (!creds.allowOnlineRent) {
    return { success: false, message: 'Online rent collection is disabled' };
  }
  if (!creds.webhookSecret) {
    return {
      success: false,
      message: 'CCAvenue access code missing (save as Webhook secret field)',
    };
  }

  const merchantData = [
    `merchant_id=${creds.keyId}`,
    `order_id=${input.orderId}`,
    `amount=${input.amountInr.toFixed(2)}`,
    `currency=INR`,
    `redirect_url=${input.redirectUrl}`,
    `cancel_url=${input.cancelUrl}`,
    `language=EN`,
    `billing_name=${input.billingName || 'Tenant'}`,
    `billing_email=${input.billingEmail || 'tenant@houseye.local'}`,
  ].join('&');

  const encRequest = ccavenueEncrypt(merchantData, creds.keySecret);

  return {
    success: true,
    actionUrl: ccavenueBase(creds.mode),
    accessCode: creds.webhookSecret,
    encRequest,
  };
}
