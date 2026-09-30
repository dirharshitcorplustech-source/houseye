/**
 * HOUSEYE.COM — POST move-out
 * Works even when subscription expired (spec exception)
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-session';
import { moveOutTenant } from '@/services/tenants/move-out';
import { successResponse, Errors } from '@/lib/utils/response';

export async function POST(
  req: NextRequest,
  { params }: { params: { tenancyId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();

    const body = await req.json().catch(() => ({}));

    const result = await moveOutTenant(user, {
      tenancyId: params.tenancyId,
      moveOutDate: body.moveOutDate,
      remarks: body.remarks,
      securityDepositSettlementAmount: body.securityDepositSettlementAmount,
    });

    if (!result.success) {
      const statusMap: Record<string, number> = {
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        CONFLICT: 409,
      };
      const status = statusMap[result.code] || 400;
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: result.code, message: result.message },
        }),
        { status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return successResponse(
      { tenancy: result.tenancy },
      'Tenant moved out successfully'
    );
  } catch (err) {
    console.error('[Houseye] move-out:', err);
    return Errors.server();
  }
}
