import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-session';
import { submitMeterReading } from '@/services/meter/submit';
import { connectDB } from '@/lib/db/connect';
import { MeterReading } from '@/models';
import { successResponse, Errors } from '@/lib/utils/response';
import { isSuperAdmin } from '@/services/authorization';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();

    await connectDB();
    const unitId = req.nextUrl.searchParams.get('unitId');
    const filter: Record<string, unknown> = {};

    if (user.role === 'TENANT') {
      // Tenants see readings for their unit via tenancy — simplified: by account isolation not needed
      return Errors.forbidden('Use tenant portal for your unit history');
    }

    if (!isSuperAdmin(user)) {
      filter.accountId = user.accountId;
    }
    if (unitId) filter.unitId = unitId;

    const readings = await MeterReading.find(filter)
      .sort({ readingDate: -1 })
      .limit(50)
      .lean();

    return successResponse({
      readings: readings.map((r) => ({
        id: r._id.toString(),
        unitId: r.unitId.toString(),
        reading: r.reading,
        previousReading: r.previousReading,
        unitsConsumed: r.unitsConsumed,
        readingDate: r.readingDate,
        isCorrection: r.isCorrection,
      })),
    });
  } catch (err) {
    console.error('[Houseye] GET meter:', err);
    return Errors.server();
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();

    const body = await req.json();
    const result = await submitMeterReading(user, {
      unitId: body.unitId,
      reading: body.reading,
      readingDate: body.readingDate,
      notes: body.notes,
    });

    if (!result.success) {
      const statusMap: Record<string, number> = {
        FORBIDDEN: 403,
        VALIDATION_ERROR: 422,
        NOT_FOUND: 404,
        SUBSCRIPTION_INACTIVE: 403,
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

    return successResponse({ reading: result.reading }, 'Reading saved', 201);
  } catch (err) {
    console.error('[Houseye] POST meter:', err);
    return Errors.server();
  }
}
