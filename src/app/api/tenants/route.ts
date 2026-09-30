/**
 * HOUSEYE.COM — Tenants / Tenancies API
 * POST — create tenancy (move-in)
 * GET  — list active tenancies (scoped)
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-session';
import { createTenancy } from '@/services/tenants/create-tenancy';
import { connectDB } from '@/lib/db/connect';
import { Tenancy } from '@/models';
import { successResponse, Errors } from '@/lib/utils/response';
import { isOwner, isSuperAdmin } from '@/services/authorization';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();

    await connectDB();

    const status = req.nextUrl.searchParams.get('status') || 'ACTIVE';
    const filter: Record<string, unknown> = {};

    if (!isSuperAdmin(user)) {
      filter.accountId = user.accountId;
    }

    if (status !== 'ALL') {
      filter.status = status;
    }

    if (
      user.role === 'MANAGER' &&
      user.propertyScopes &&
      user.propertyScopes.length > 0
    ) {
      filter.propertyId = { $in: user.propertyScopes };
    }

    const tenancies = await Tenancy.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()
      .exec();

    return successResponse({
      tenancies: tenancies.map((t) => ({
        id: t._id.toString(),
        fullName: t.fullName,
        status: t.status,
        rent: t.rent,
        unitId: t.unitId.toString(),
        propertyId: t.propertyId.toString(),
        startDate: t.startDate,
        moveOutDate: t.moveOutDate,
      })),
    });
  } catch (err) {
    console.error('[Houseye] GET tenants:', err);
    return Errors.server();
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();

    const body = await req.json();
    const result = await createTenancy(user, {
      propertyId: body.propertyId,
      unitId: body.unitId,
      fullName: body.fullName,
      mobile: body.mobile,
      email: body.email,
      rent: body.rent,
      securityDeposit: body.securityDeposit,
      startDate: body.startDate,
      occupants: body.occupants,
    });

    if (!result.success) {
      const statusMap: Record<string, number> = {
        FORBIDDEN: 403,
        VALIDATION_ERROR: 422,
        SUBSCRIPTION_INACTIVE: 403,
        RESOURCE_LIMIT: 403,
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
      {
        tenancy: result.tenancy,
        tenant: result.tenant,
        inviteLink: result.inviteLink,
      },
      'Tenant added',
      201
    );
  } catch (err) {
    console.error('[Houseye] POST tenants:', err);
    return Errors.server();
  }
}
