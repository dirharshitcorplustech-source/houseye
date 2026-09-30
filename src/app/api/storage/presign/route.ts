/**
 * HOUSEYE.COM — Presigned S3 upload URL
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-session';
import {
  buildObjectKey,
  createPresignedUpload,
} from '@/services/storage/s3';
import { successResponse, Errors } from '@/lib/utils/response';
import { isSuperAdmin } from '@/services/authorization';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();

    const body = await req.json();
    const fileName = body.fileName?.trim();
    const contentType = body.contentType || 'application/octet-stream';
    const category = body.category || 'other';

    if (!fileName) {
      return Errors.validation('fileName is required');
    }

    let accountId = user.accountId;
    if (user.role === 'TENANT' && body.accountId) {
      // Tenant must use their tenancy account — simplified: require accountId match via tenancy later
      accountId = body.accountId;
    }
    if (!accountId && !isSuperAdmin(user)) {
      return Errors.forbidden();
    }

    const key = buildObjectKey({
      accountId: accountId || 'platform',
      category,
      fileName,
    });

    const result = await createPresignedUpload({
      key,
      contentType,
      expiresIn: 900,
    });

    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'STORAGE_ERROR', message: result.message },
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return successResponse({
      uploadUrl: result.url,
      key: result.key,
      expiresIn: 900,
    });
  } catch (err) {
    console.error('[Houseye] presign:', err);
    return Errors.server();
  }
}
