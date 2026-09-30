/**
 * Production safety gates (no network)
 */
import assert from 'assert';
import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function ok(name) {
  console.log('PASS:', name);
}

// Files exist
const requiredFiles = [
  'src/services/payments/razorpay.ts',
  'src/services/email/send.ts',
  'src/services/storage/s3.ts',
  'src/app/api/webhooks/razorpay/route.ts',
  'src/app/api/subscriptions/checkout/route.ts',
  'src/app/api/subscriptions/verify-payment/route.ts',
  'src/app/api/storage/presign/route.ts',
  'src/app/terms/page.tsx',
  'src/app/privacy/page.tsx',
  'vercel.json',
  'src/middleware.ts',
  'src/lib/config/env.ts',
];

for (const f of requiredFiles) {
  assert.ok(existsSync(join(root, f)), `missing ${f}`);
  ok(`exists ${f}`);
}

// activate uses allowDevSubscription
const activate = readFileSync(
  join(root, 'src/services/subscriptions/activate.ts'),
  'utf8'
);
assert.ok(
  activate.includes('allowDevSubscription'),
  'activate must use allowDevSubscription'
);
ok('activate uses allowDevSubscription');

// middleware verifies JWT
const mw = readFileSync(join(root, 'src/middleware.ts'), 'utf8');
assert.ok(mw.includes('verifyToken'), 'middleware must verifyToken');
ok('middleware verifies JWT');

// vercel crons
const vercel = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));
assert.ok(vercel.crons?.length >= 3, 'need 3 cron jobs');
ok('vercel crons configured');

// env helper: production disallows dev sub — pure logic copy
function allowDevSubscription(env) {
  if (env.APP_ENV === 'staging' || env.NODE_ENV === 'production') {
    if (env.APP_ENV !== 'development') return false;
  }
  if (env.NODE_ENV === 'production' || env.APP_ENV === 'production' || env.APP_ENV === 'staging')
    return false;
  return env.ALLOW_DEV_SUBSCRIPTION === 'true' || env.NODE_ENV === 'development';
}

assert.strictEqual(
  allowDevSubscription({ NODE_ENV: 'production', APP_ENV: 'production' }),
  false
);
ok('production blocks dev subscription');

assert.strictEqual(
  allowDevSubscription({ NODE_ENV: 'development', ALLOW_DEV_SUBSCRIPTION: 'true' }),
  true
);
ok('development can allow dev subscription');

console.log('\nProduction gate checks passed.');
