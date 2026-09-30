/**
 * HOUSEYE.COM — Properties API
 * GET  — list properties (scoped)
 * POST — create property (Owner + active subscription)
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-session';
import { createProperty } from '@/services/properties/create-property';
import { listProperties } from '@/services/properties/list-properties';
import { successResponse, Errors } from '@/lib/utils/response';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();

    const result = await listProperties(user);
    return successResponse({ properties: result.properties });
  } catch (err) {
    console.error('[Houseye] GET /properties:', err);
    return Errors.server();
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();

    const body = await req.json();

    const result = await createProperty(user, {
      name: body.name,
      propertyType: body.propertyType,
      address: body.address,
      notes: body.notes,
    });

    if (!result.success) {
      const statusMap: Record<string, number> = {
        FORBIDDEN: 403,
        VALIDATION_ERROR: 422,
        SUBSCRIPTION_INACTIVE: 403,
        SUBSCRIPTION_REQUIRED: 403,
        RESOURCE_LIMIT: 403,
        ACCOUNT_NOT_FOUND: 404,
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

    return successResponse({ property: result.property }, 'Property created', 201);
  } catch (err) {
    console.error('[Houseye] POST /properties:', err);
    return Errors.server();
  }
}
