import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-session';
import {
  listSessions,
  terminateSession,
  terminateOtherSessions,
} from '@/services/auth/sessions';
import { successResponse, Errors } from '@/lib/utils/response';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();

    const sessions = await listSessions(user);
    return successResponse({ sessions });
  } catch (err) {
    console.error('[Houseye] list sessions:', err);
    return Errors.server();
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();

    const body = await req.json().catch(() => ({}));

    if (body.allOthers) {
      const count = await terminateOtherSessions(user);
      return successResponse({ terminated: count }, 'Other sessions terminated');
    }

    if (!body.sessionId) {
      return Errors.validation('sessionId is required');
    }

    const result = await terminateSession(user, body.sessionId);
    if (!result.success) {
      return Errors.notFound(result.message);
    }

    return successResponse(null, 'Session terminated');
  } catch (err) {
    console.error('[Houseye] terminate session:', err);
    return Errors.server();
  }
}
