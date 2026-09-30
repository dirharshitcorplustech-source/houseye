import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-session';
import {
  suspendStaff,
  removeStaff,
  reactivateStaff,
} from '@/services/users/staff-lifecycle';
import { successResponse, Errors } from '@/lib/utils/response';

export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();

    const body = await req.json();
    const action = body.action as string;

    let result;
    if (action === 'suspend') {
      result = await suspendStaff(user, params.userId);
    } else if (action === 'remove') {
      result = await removeStaff(user, params.userId);
    } else if (action === 'reactivate') {
      result = await reactivateStaff(user, params.userId);
    } else {
      return Errors.validation('action must be suspend, remove, or reactivate');
    }

    if (!result.success) {
      const statusMap: Record<string, number> = {
        FORBIDDEN: 403,
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

    return successResponse(null, `Staff ${action}d successfully`);
  } catch (err) {
    console.error('[Houseye] staff status:', err);
    return Errors.server();
  }
}
