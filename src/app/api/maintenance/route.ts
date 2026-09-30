import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-session';
import { createMaintenanceRequest } from '@/services/maintenance/create';
import { connectDB } from '@/lib/db/connect';
import MaintenanceRequest from '@/models/MaintenanceRequest';
import { successResponse, Errors } from '@/lib/utils/response';
import { isSuperAdmin } from '@/services/authorization';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();

    await connectDB();
    const filter: Record<string, unknown> = {};

    if (user.role === 'TENANT') {
      filter.tenantUserId = user.id;
    } else if (!isSuperAdmin(user)) {
      filter.accountId = user.accountId;
      if (user.role === 'MANAGER' && user.propertyScopes?.length) {
        filter.propertyId = { $in: user.propertyScopes };
      }
    }

    const status = req.nextUrl.searchParams.get('status');
    if (status) filter.status = status;

    const items = await MaintenanceRequest.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return successResponse({
      requests: items.map((r) => ({
        id: r._id.toString(),
        category: r.category,
        description: r.description,
        status: r.status,
        priority: r.priority,
        costResponsibility: r.costResponsibility,
        disputed: r.disputed,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    console.error('[Houseye] GET maintenance:', err);
    return Errors.server();
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();

    const body = await req.json();
    const result = await createMaintenanceRequest(user, {
      category: body.category,
      description: body.description,
      photoFileName: body.photoFileName,
      tenancyId: body.tenancyId,
    });

    if (!result.success) {
      const statusMap: Record<string, number> = {
        VALIDATION_ERROR: 422,
        NOT_FOUND: 404,
        FORBIDDEN: 403,
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

    return successResponse(
      { request: result.request },
      'Maintenance request submitted',
      201
    );
  } catch (err) {
    console.error('[Houseye] POST maintenance:', err);
    return Errors.server();
  }
}
