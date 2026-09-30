/**
 * HOUSEYE.COM — Environment validation
 * Production boot fails fast if critical secrets missing.
 */

export type AppEnv = 'development' | 'test' | 'production' | 'staging';

export function getAppEnv(): AppEnv {
  const n = process.env.NODE_ENV;
  if (process.env.APP_ENV === 'staging') return 'staging';
  if (n === 'production') return 'production';
  if (n === 'test') return 'test';
  return 'development';
}

export function isProductionLike(): boolean {
  const e = getAppEnv();
  return e === 'production' || e === 'staging';
}

/** Dev subscription activate is NEVER allowed in production/staging */
export function allowDevSubscription(): boolean {
  if (isProductionLike()) return false;
  return process.env.ALLOW_DEV_SUBSCRIPTION === 'true' || getAppEnv() === 'development';
}

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

export function getOptionalEnv(name: string): string | undefined {
  return process.env[name] || undefined;
}

/**
 * Call from server startup / health in production to surface misconfig
 */
export function validateProductionEnv(): { ok: boolean; missing: string[] } {
  if (!isProductionLike()) {
    return { ok: true, missing: [] };
  }

  const required = [
    'MONGODB_URI',
    'JWT_SECRET',
    'AUTH_SECRET',
    'NEXT_PUBLIC_APP_URL',
    'CRON_SECRET',
  ];

  // Payment — at least one gateway
  const hasRazorpay =
    !!process.env.RAZORPAY_KEY_ID && !!process.env.RAZORPAY_KEY_SECRET;
  const hasStripe =
    !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_WEBHOOK_SECRET;

  // Email
  const hasEmail =
    (!!process.env.SMTP_HOST && !!process.env.SMTP_USER) ||
    !!process.env.RESEND_API_KEY;

  // S3
  const hasS3 =
    !!process.env.AWS_ACCESS_KEY_ID &&
    !!process.env.AWS_SECRET_ACCESS_KEY &&
    !!process.env.AWS_S3_BUCKET;

  const missing = required.filter((k) => !process.env[k]);
  if (!hasRazorpay && !hasStripe) missing.push('RAZORPAY_* or STRIPE_*');
  if (!hasEmail) missing.push('SMTP_* or RESEND_API_KEY');
  if (!hasS3) missing.push('AWS_S3_* credentials');

  return { ok: missing.length === 0, missing };
}
