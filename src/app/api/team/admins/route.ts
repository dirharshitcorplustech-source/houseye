import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-session';
import { inviteAdmin } from '@/services/users/invite-admin';
import { connectDB } from '@/lib/db/connect';
import { User } from '@/models';
import { successResponse, Errors } from '@/lib/utils/response';
import { isOwner, isSuperAdmin } from '@/services/authorization';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();
    if (!user.accountId && !isSuperAdmin(user)) return Errors.forbidden();

    await connectDB();
    const admins = await User.find({
      accountId: user.accountId,
      role: 'ADMIN',
      status: { $nin: ['REMOVED'] },
    })
      .select('fullName username email status invitationSentAt')
      .lean();

    return successResponse({
      admins: admins.map((a) => ({
        id: a._id.toString(),
        fullName: a.fullName,
        username: a.username,
        email: a.email,
        status: a.status,
      })),
    });
  } catch (err) {
    console.error('[Houseye] GET admins:', err);
    return Errors.server();
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();

    const body = await req.json();
    const result = await inviteAdmin(user, {
      fullName: body.fullName,
      email: body.email,
      mobile: body.mobile,
      propertyIds: body.propertyIds,
      permissions: body.permissions,
      fullAccess: body.fullAccess,
    });

    if (!result.success) {
      const statusMap: Record<string, number> = {
        FORBIDDEN: 403,
        VALIDATION_ERROR: 422,
        RESOURCE_LIMIT: 403,
        SUBSCRIPTION_INACTIVE: 403,
        EMAIL_EXISTS: 409,
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
        admin: result.admin,
        inviteLink: result.inviteLink,
        invitationToken: result.invitationToken,
      },
      'Admin invited',
      201
    );
  } catch (err) {
    console.error('[Houseye] POST admins:', err);
    return Errors.server();
  }
}
