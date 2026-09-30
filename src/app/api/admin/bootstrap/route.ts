/**
 * HOUSEYE.COM — POST /api/admin/bootstrap
 * One-time Super Admin creation from env vars.
 * Protected by a simple setup key in production.
 */

import { NextRequest } from 'next/server';
import { bootstrapSuperAdmin } from '@/services/auth/bootstrap-super-admin';
import { successResponse, Errors } from '@/lib/utils/response';

export async function POST(req: NextRequest) {
  try {
    // Optional setup key protection
    const setupKey = process.env.BOOTSTRAP_SETUP_KEY;
    if (setupKey) {
      const provided =
        req.headers.get('x-setup-key') ||
        (await req.json().catch(() => ({}))).setupKey;
      if (provided !== setupKey) {
        return Errors.forbidden('Invalid setup key');
      }
    }

    // Only allow in non-production OR when explicitly enabled
    if (
      process.env.NODE_ENV === 'production' &&
      process.env.ALLOW_BOOTSTRAP !== 'true'
    ) {
      return Errors.forbidden('Bootstrap is disabled in production');
    }

    const result = await bootstrapSuperAdmin();

    return successResponse(result, result.message);
  } catch (err) {
    console.error('[Houseye] Bootstrap error:', err);
    return Errors.server();
  }
}
