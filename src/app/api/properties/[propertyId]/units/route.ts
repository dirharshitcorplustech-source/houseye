/**
 * HOUSEYE.COM — Units under a property
 * POST — create unit (Owner + entitlement)
 * GET  — list units for property
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-session';
import { createUnit } from '@/services/properties/create-unit';
import { connectDB } from '@/lib/db/connect';
import { Unit, Property } from '@/models';
import { successResponse, Errors } from '@/lib/utils/response';
import { isOwner, isSuperAdmin, hasPropertyScope } from '@/services/authorization';

export async function GET(
  _req: NextRequest,
  { params }: { params: { propertyId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();

    const { propertyId } = params;
    await connectDB();

    const property = await Property.findOne({
      _id: propertyId,
      deletedAt: null,
    }).exec();

    if (!property) return Errors.notFound('Property not found');

    // Account isolation
    if (
      !isSuperAdmin(user) &&
      property.accountId.toString() !== user.accountId
    ) {
      return Errors.forbidden();
    }

    // Scope for Manager/Admin
    if (!isOwner(user) && !isSuperAdmin(user)) {
      const scope = hasPropertyScope(user, propertyId);
      if (!scope.allowed) return Errors.forbidden(scope.message);
    }

    const units = await Unit.find({
      propertyId,
      deletedAt: null,
    })
      .sort({ unitNumber: 1 })
      .select(
        'unitNumber unitType vacancyStatus floorId bedrooms bathrooms areaSqft createdAt'
      )
      .lean()
      .exec();

    return successResponse({
      units: units.map((u) => ({
        id: u._id.toString(),
        unitNumber: u.unitNumber,
        unitType: u.unitType,
        vacancyStatus: u.vacancyStatus,
        floorId: u.floorId?.toString(),
        bedrooms: u.bedrooms,
        bathrooms: u.bathrooms,
        areaSqft: u.areaSqft,
        createdAt: u.createdAt,
      })),
    });
  } catch (err) {
    console.error('[Houseye] GET units:', err);
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
    const result = await createUnit(user, {
      propertyId: params.propertyId,
      unitNumber: body.unitNumber,
      unitType: body.unitType,
      floorId: body.floorId,
      blockId: body.blockId,
      buildingId: body.buildingId,
      bedrooms: body.bedrooms,
      bathrooms: body.bathrooms,
      areaSqft: body.areaSqft,
      furnishing: body.furnishing,
      notes: body.notes,
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

    return successResponse({ unit: result.unit }, 'Unit created', 201);
  } catch (err) {
    console.error('[Houseye] POST units:', err);
    return Errors.server();
  }
}
