/**
 * HOUSEYE.COM — Floors API
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-session';
import { createFloor } from '@/services/properties/create-floor';
import { connectDB } from '@/lib/db/connect';
import { Floor, Property } from '@/models';
import { successResponse, Errors } from '@/lib/utils/response';
import {
  isOwner,
  isSuperAdmin,
  hasPropertyScope,
} from '@/services/authorization';

export async function GET(
  _req: NextRequest,
  { params }: { params: { propertyId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();

    await connectDB();
    const property = await Property.findOne({
      _id: params.propertyId,
      deletedAt: null,
    }).exec();

    if (!property) return Errors.notFound('Property not found');

    if (
      !isSuperAdmin(user) &&
      property.accountId.toString() !== user.accountId
    ) {
      return Errors.forbidden();
    }

    if (!isOwner(user) && !isSuperAdmin(user)) {
      const scope = hasPropertyScope(user, params.propertyId);
      if (!scope.allowed) return Errors.forbidden(scope.message);
    }

    const floors = await Floor.find({
      propertyId: params.propertyId,
      deletedAt: null,
    })
      .sort({ sortOrder: 1, name: 1 })
      .lean()
      .exec();

    return successResponse({
      floors: floors.map((f) => ({
        id: f._id.toString(),
        name: f.name,
        sortOrder: f.sortOrder,
        blockId: f.blockId?.toString(),
        buildingId: f.buildingId?.toString(),
      })),
    });
  } catch (err) {
    console.error('[Houseye] GET floors:', err);
    return Errors.server();
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { propertyId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();

    const body = await req.json();
    const result = await createFloor(user, {
      propertyId: params.propertyId,
      name: body.name,
      blockId: body.blockId,
      buildingId: body.buildingId,
      sortOrder: body.sortOrder,
    });

    if (!result.success) {
      const statusMap: Record<string, number> = {
        FORBIDDEN: 403,
        VALIDATION_ERROR: 422,
        SUBSCRIPTION_INACTIVE: 403,
        SUBSCRIPTION_REQUIRED: 403,
        NOT_FOUND: 404,
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

    return successResponse({ floor: result.floor }, 'Floor created', 201);
  } catch (err) {
    console.error('[Houseye] POST floors:', err);
    return Errors.server();
  }
}
