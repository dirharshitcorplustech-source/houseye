/**
 * HOUSEYE.COM — Owner PayU / Cashfree / CCAvenue
 * Tenant → Owner only. Keys are Owner's merchant credentials.
 *
 * Mapping on AccountGateway:
 *   keyIdEnc     → merchant / app id / access key
 *   keySecretEnc → salt / secret key
 *   webhookSecretEnc → optional webhook secret (Cashfree client secret extra, etc.)
 */

import crypto from 'crypto';
import {
  getOwnerGatewayCredentials,
} from '@/services/payments/owner-gateway';

function baseUrl(mode: 'test' | 'live', provider: 'PAYU' | 'CASHFREE' | 'CCAVENUE') {
  if (provider === 'PAYU') {
    return mode === 'live'
      ? 'https://secure.payu.in'
      : 'https://test.payu.in';
  }
  if (provider === 'CASHFREE') {
    return mode === 'live'
      ? 'https://api.cashfree.com/pg'
      : 'https://sandbox.cashfree.com/pg';
  }
  // CCAvenue
  return mode === 'live'
    ? 'https://secure.ccavenue.com'
    : 'https://test.ccavenue.com';
}

/** ---------- PayU ---------- */

export async function createOwnerPayUPayment(input: {
  accountId: string;
  amount: number; // INR
  txnId: string;
  productInfo: string;
  firstname: string;
  email: string;
  phone?: string;
  successUrl: string;
  failureUrl: string;
  udf1?: string; // paymentId
  udf2?: string; // billId
}): Promise<
  | {
      success: true;
      actionUrl: string;
      params: Record<string, string>;
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

  const key = creds.keyId; // merchant key
  const salt = creds.keySecret;

  const udf1 = input.udf1 || '';
  const udf2 = input.udf2 || '';
  const udf3 = '';
  const udf4 = '';
  const udf5 = '';

  // hash = key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt
  const amountStr = input.amount.toFixed(2);
  const hashString = [
    key,
    input.txnId,
    amountStr,
    input.productInfo,
    input.firstname,
    input.email,
    udf1,
    udf2,
    udf3,
    udf4,
    udf5,
    '',
    '',
    '',
    '',
    '',
    salt,
  ].join('|');

  const hash = crypto.createHash('sha512').update(hashString).digest('hex');

  const params: Record<string, string> = {
    key,
    txnid: input.txnId,
    amount: amountStr,
    productinfo: input.productInfo,
    firstname: input.firstname,
    email: input.email,
    phone: input.phone || '9999999999',
    surl: input.successUrl,
    furl: input.failureUrl,
    hash,
    udf1,
    udf2,
    service_provider: 'payu_paisa',
  };

  return {
    success: true,
    actionUrl: `${baseUrl(creds.mode, 'PAYU')}/_payment`,
    params,
  };
}

export function verifyPayUResponseHash(params: {
  key: string;
  salt: string;
  status: string;
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
  hash: string;
}): boolean {
  // reverse hash: salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
  const hashString = [
    params.salt,
    params.status,
    '',
    '',
    '',
    '',
    '',
    params.udf5 || '',
    params.udf4 || '',
    params.udf3 || '',
    params.udf2 || '',
    params.udf1 || '',
    params.email,
    params.firstname,
    params.productinfo,
    params.amount,
    params.txnid,
    params.key,
  ].join('|');
  const expected = crypto.createHash('sha512').update(hashString).digest('hex');
  return expected.toLowerCase() === (params.hash || '').toLowerCase();
}

/** ---------- Cashfree ---------- */

export async function createOwnerCashfreeOrder(input: {
  accountId: string;
  orderId: string;
  amount: number;
  customerId: string;
  customerPhone: string;
  customerEmail?: string;
  returnUrl: string;
  notifyUrl?: string;
}): Promise<
  | {
      success: true;
      paymentSessionId: string;
      orderId: string;
      env: 'sandbox' | 'production';
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

  const appId = creds.keyId;
  const secretKey = creds.keySecret;
  const apiBase = baseUrl(creds.mode, 'CASHFREE');

  const res = await fetch(`${apiBase}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': appId,
      'x-client-secret': secretKey,
      'x-api-version': '2023-08-01',
    },
    body: JSON.stringify({
      order_id: input.orderId,
      order_amount: input.amount,
      order_currency: 'INR',
      customer_details: {
        customer_id: input.customerId,
        customer_phone: input.customerPhone,
        customer_email: input.customerEmail,
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
    payment_session_id?: string;
    order_id?: string;
    cf_order_id?: string;
  };

  if (!data.payment_session_id) {
    return { success: false, message: 'Cashfree did not return payment session' };
  }

  return {
    success: true,
    paymentSessionId: data.payment_session_id,
    orderId: data.order_id || input.orderId,
    env: creds.mode === 'live' ? 'production' : 'sandbox',
  };
}

export async function fetchCashfreeOrderStatus(input: {
  accountId: string;
  orderId: string;
}): Promise<
  | { success: true; orderStatus: string; raw: Record<string, unknown> }
  | { success: false; message: string }
> {
  const creds = await getOwnerGatewayCredentials(input.accountId);
  if (!creds || creds.provider !== 'CASHFREE') {
    return { success: false, message: 'Cashfree not configured' };
  }
  const apiBase = baseUrl(creds.mode, 'CASHFREE');
  const res = await fetch(`${apiBase}/orders/${input.orderId}`, {
    headers: {
      'x-client-id': creds.keyId,
      'x-client-secret': creds.keySecret,
      'x-api-version': '2023-08-01',
    },
  });
  if (!res.ok) {
    return { success: false, message: 'Could not fetch Cashfree order' };
  }
  const data = (await res.json()) as { order_status?: string };
  return {
    success: true,
    orderStatus: data.order_status || 'UNKNOWN',
    raw: data as Record<string, unknown>,
  };
}

/** ---------- CCAvenue ---------- */

function ccavenueEncrypt(plainText: string, workingKey: string): string {
  const md5 = crypto.createHash('md5').update(workingKey).digest();
  const iv = Buffer.from([
    0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b,
    0x0c, 0x0d, 0x0e, 0x0f,
  ]);
  const cipher = crypto.createCipheriv('aes-128-cbc', md5, iv);
  let encoded = cipher.update(plainText, 'utf8', 'hex');
  encoded += cipher.final('hex');
  return encoded;
}

function ccavenueDecrypt(encText: string, workingKey: string): string {
  const md5 = crypto.createHash('md5').update(workingKey).digest();
  const iv = Buffer.from([
    0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b,
    0x0c, 0x0d, 0x0e, 0x0f,
  ]);
  const decipher = crypto.createDecipheriv('aes-128-cbc', md5, iv);
  let decoded = decipher.update(encText, 'hex', 'utf8');
  decoded += decipher.final('utf8');
  return decoded;
}

export async function createOwnerCCAvenuePayment(input: {
  accountId: string;
  orderId: string;
  amount: number;
  billingName: string;
  billingEmail: string;
  billingTel?: string;
  redirectUrl: string;
  cancelUrl: string;
  merchantParam1?: string; // paymentId
  merchantParam2?: string; // billId
}): Promise<
  | {
      success: true;
      actionUrl: string;
      encRequest: string;
      accessCode: string;
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

  // keyId = access code, keySecret = working key, optional merchant id in webhookSecret field unused
  const accessCode = creds.keyId;
  const workingKey = creds.keySecret;

  const merchantId =
    process.env.CCAVENUE_DEFAULT_MERCHANT_ID ||
    (creds as { merchantId?: string }).merchantId ||
    '';

  // Prefer merchant id from notes — store as keyId format "merchantId|accessCode" optional
  let mid = merchantId;
  let access = accessCode;
  if (accessCode.includes('|')) {
    const [a, b] = accessCode.split('|');
    mid = a;
    access = b;
  }

  const pairs = [
    `merchant_id=${mid}`,
    `order_id=${input.orderId}`,
    `currency=INR`,
    `amount=${input.amount.toFixed(2)}`,
    `redirect_url=${input.redirectUrl}`,
    `cancel_url=${input.cancelUrl}`,
    `language=EN`,
    `billing_name=${input.billingName}`,
    `billing_email=${input.billingEmail}`,
    `billing_tel=${input.billingTel || '9999999999'}`,
    `merchant_param1=${input.merchantParam1 || ''}`,
    `merchant_param2=${input.merchantParam2 || ''}`,
  ];

  const plain = pairs.join('&');
  const encRequest = ccavenueEncrypt(plain, workingKey);

  const host = baseUrl(creds.mode, 'CCAVENUE');
  const actionUrl = `${host}/transaction/transaction.do?command=initiateTransaction`;

  return {
    success: true,
    actionUrl,
    encRequest,
    accessCode: access,
  };
}

export function decryptCCAvenueResponse(
  encResponse: string,
  workingKey: string
): Record<string, string> {
  const plain = ccavenueDecrypt(encResponse, workingKey);
  const out: Record<string, string> = {};
  for (const part of plain.split('&')) {
    const [k, ...rest] = part.split('=');
    if (k) out[k] = decodeURIComponent(rest.join('=') || '');
  }
  return out;
}
