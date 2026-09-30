import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-session';
import { updateMaintenanceStatus } from '@/services/maintenance/update-status';
import { successResponse, Errors } from '@/lib/utils/response';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();

    const body = await req.json();
    const result = await updateMaintenanceStatus(
      user,
      params.id,
      body.status,
      body.note
    );

    if (!result.success) {
      const statusMap: Record<string, number> = {
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        CONFLICT: 409,
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

    return successResponse({ request: result.request }, 'Status updated');
  } catch (err) {
    console.error('[Houseye] maintenance status:', err);
    return Errors.server();
  }
}
