/**
 * HOUSEYE.COM — Manager invite API
 * POST /api/team/managers
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-session';
import { inviteManager } from '@/services/users/invite-manager';
import { successResponse, Errors } from '@/lib/utils/response';
import { DEFAULT_MANAGER_PERMISSIONS } from '@/constants/permissions';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();

    const body = await req.json();

    const result = await inviteManager(user, {
      fullName: body.fullName,
      email: body.email,
      mobile: body.mobile,
      propertyIds: body.propertyIds || [],
      permissions: body.permissions || DEFAULT_MANAGER_PERMISSIONS,
      employeeId: body.employeeId,
    });

    if (!result.success) {
      const statusMap: Record<string, number> = {
        FORBIDDEN: 403,
        VALIDATION_ERROR: 422,
        SUBSCRIPTION_INACTIVE: 403,
        RESOURCE_LIMIT: 403,
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

    // Invitation link for copy
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteLink = `${baseUrl}/accept-invite?token=${result.manager.invitationToken}`;

    return successResponse(
      {
        manager: {
          id: result.manager.id,
          username: result.manager.username,
          fullName: result.manager.fullName,
          status: result.manager.status,
        },
        inviteLink,
        // Token only returned to authorized inviter for share channels
        invitationToken: result.manager.invitationToken,
      },
      'Manager invited',
      201
    );
  } catch (err) {
    console.error('[Houseye] POST /team/managers:', err);
    return Errors.server();
  }
}
