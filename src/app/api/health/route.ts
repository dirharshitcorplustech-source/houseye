/**
 * HOUSEYE.COM — Health check + production config surface
 */

import { connectDB } from '@/lib/db/connect';
import mongoose from 'mongoose';
import { validateProductionEnv, getAppEnv } from '@/lib/config/env';
import { isRazorpayConfigured } from '@/services/payments/razorpay';
import { isS3Configured } from '@/services/storage/s3';
import { isEmailConfigured } from '@/services/email/send';

export async function GET() {
  const started = Date.now();
  let db: 'up' | 'down' = 'down';

  try {
    await connectDB();
    db = mongoose.connection.readyState === 1 ? 'up' : 'down';
  } catch {
    db = 'down';
  }

  const envCheck = validateProductionEnv();
  const integrations = {
    razorpay: isRazorpayConfigured(),
    email: isEmailConfigured(),
    s3: isS3Configured(),
  };

  const ok = db === 'up';
  const status = ok ? 200 : 503;

  return new Response(
    JSON.stringify({
      ok,
      service: 'houseye',
      version: '0.2.0',
      env: getAppEnv(),
      db,
      integrations,
      productionConfig: envCheck,
      uptimeMs: process.uptime() * 1000,
      latencyMs: Date.now() - started,
      timestamp: new Date().toISOString(),
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
