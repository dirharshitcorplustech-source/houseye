/**
 * HOUSEYE.COM — Trash list + soft delete
 * GET — list trashed items for account
 * POST — soft delete { type, id }
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-session';
import { softDelete } from '@/services/trash/soft-delete';
import { connectDB } from '@/lib/db/connect';
import { Property, Unit } from '@/models';
import { successResponse, Errors } from '@/lib/utils/response';
import { isOwner, isSuperAdmin } from '@/services/authorization';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();

    if (!isOwner(user) && !isSuperAdmin(user)) {
      return Errors.forbidden('Only Owner can access Trash');
    }

    await connectDB();

    const filter: Record<string, unknown> = {
      deletedAt: { $ne: null },
    };
    if (!isSuperAdmin(user)) {
      filter.accountId = user.accountId;
    }

    const [properties, units] = await Promise.all([
      Property.find(filter).sort({ deletedAt: -1 }).limit(50).lean(),
      Unit.find(filter).sort({ deletedAt: -1 }).limit(50).lean(),
    ]);

    return successResponse({
      items: [
        ...properties.map((p) => ({
          type: 'property' as const,
          id: p._id.toString(),
          name: p.name,
          deletedAt: p.deletedAt,
        })),
        ...units.map((u) => ({
          type: 'unit' as const,
          id: u._id.toString(),
          name: u.unitNumber,
          propertyId: u.propertyId.toString(),
          deletedAt: u.deletedAt,
        })),
      ],
    });
  } catch (err) {
    console.error('[Houseye] GET trash:', err);
    return Errors.server();
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();

    const body = await req.json();
    const result = await softDelete(user, body.type, body.id);

    if (!result.success) {
      const statusMap: Record<string, number> = {
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        CONFLICT: 409,
        VALIDATION_ERROR: 422,
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

    return successResponse(null, 'Moved to Trash');
  } catch (err) {
    console.error('[Houseye] POST trash:', err);
    return Errors.server();
  }
}
