import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-session';
import { createNotice } from '@/services/notices/create';
import { connectDB } from '@/lib/db/connect';
import { Notice, Tenancy } from '@/models';
import { successResponse, Errors } from '@/lib/utils/response';
import { isSuperAdmin } from '@/services/authorization';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();

    await connectDB();
    const now = new Date();
    const filter: Record<string, unknown> = {
      deletedAt: null,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    };

    if (user.role === 'TENANT') {
      const tenancy = await Tenancy.findOne({
        primaryTenantUserId: user.id,
        status: { $in: ['ACTIVE', 'NOTICE'] },
      })
        .select('accountId propertyId')
        .lean();
      if (!tenancy) {
        return successResponse({ notices: [] });
      }
      filter.accountId = tenancy.accountId;
      filter.$and = [
        {
          $or: [
            { propertyId: null },
            { propertyId: { $exists: false } },
            { propertyId: tenancy.propertyId },
          ],
        },
      ];
    } else if (!isSuperAdmin(user)) {
      filter.accountId = user.accountId;
      if (user.role === 'MANAGER' && user.propertyScopes?.length) {
        filter.$and = [
          {
            $or: [
              { propertyId: null },
              { propertyId: { $exists: false } },
              { propertyId: { $in: user.propertyScopes } },
            ],
          },
        ];
      }
    }

    const notices = await Notice.find(filter)
      .sort({ pinned: -1, publishedAt: -1 })
      .limit(30)
      .lean();

    return successResponse({
      notices: notices.map((n) => ({
        id: n._id.toString(),
        title: n.title,
        body: n.body,
        pinned: n.pinned,
        propertyId: n.propertyId?.toString(),
        publishedAt: n.publishedAt,
        expiresAt: n.expiresAt,
      })),
    });
  } catch (err) {
    console.error('[Houseye] GET notices:', err);
    return Errors.server();
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();

    const body = await req.json();
    const result = await createNotice(user, {
      title: body.title,
      body: body.body,
      propertyId: body.propertyId,
      pinned: body.pinned,
      expiresAt: body.expiresAt,
    });

    if (!result.success) {
      const statusMap: Record<string, number> = {
        FORBIDDEN: 403,
        VALIDATION_ERROR: 422,
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

    return successResponse({ notice: result.notice }, 'Notice published', 201);
  } catch (err) {
    console.error('[Houseye] POST notices:', err);
    return Errors.server();
  }
}
