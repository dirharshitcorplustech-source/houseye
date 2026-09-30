import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-session';
import { registerDocument } from '@/services/documents/register';
import { connectDB } from '@/lib/db/connect';
import { DocumentRecord } from '@/models';
import { successResponse, Errors } from '@/lib/utils/response';
import { isSuperAdmin } from '@/services/authorization';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();

    await connectDB();
    const filter: Record<string, unknown> = { deletedAt: null };

    if (user.role === 'TENANT') {
      filter.tenantUserId = user.id;
    } else if (!isSuperAdmin(user)) {
      filter.accountId = user.accountId;
    }

    const tenancyId = req.nextUrl.searchParams.get('tenancyId');
    if (tenancyId) filter.tenancyId = tenancyId;

    const docs = await DocumentRecord.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return successResponse({
      documents: docs.map((d) => ({
        id: d._id.toString(),
        title: d.title,
        category: d.category,
        fileName: d.fileName,
        sizeBytes: d.sizeBytes,
        createdAt: d.createdAt,
      })),
    });
  } catch (err) {
    console.error('[Houseye] GET documents:', err);
    return Errors.server();
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();

    const body = await req.json();
    const result = await registerDocument(user, {
      title: body.title,
      fileName: body.fileName,
      category: body.category || 'OTHER',
      propertyId: body.propertyId,
      unitId: body.unitId,
      tenancyId: body.tenancyId,
      tenantUserId: body.tenantUserId,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      fileKey: body.fileKey,
    });

    if (!result.success) {
      const statusMap: Record<string, number> = {
        FORBIDDEN: 403,
        VALIDATION_ERROR: 422,
        SUBSCRIPTION_INACTIVE: 403,
        RESOURCE_LIMIT: 403,
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
      { document: result.document },
      'Document registered',
      201
    );
  } catch (err) {
    console.error('[Houseye] POST documents:', err);
    return Errors.server();
  }
}
