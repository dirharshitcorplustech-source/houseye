/**
 * HOUSEYE.COM — List & terminate sessions
 */

import { connectDB } from '@/lib/db/connect';
import { Session } from '@/models';
import { CurrentUser } from '@/lib/auth/get-session';

export async function listSessions(user: CurrentUser) {
  await connectDB();
  const sessions = await Session.find({ userId: user.id })
    .sort({ lastActiveAt: -1 })
    .lean();

  return sessions.map((s) => ({
    sessionId: s.sessionId,
    deviceInfo: s.deviceInfo,
    ipAddress: s.ipAddress,
    userAgent: s.userAgent,
    lastActiveAt: s.lastActiveAt,
    createdAt: s.createdAt,
    isCurrent: s.sessionId === user.sessionId,
  }));
}

export async function terminateSession(
  user: CurrentUser,
  sessionId: string
): Promise<{ success: true } | { success: false; message: string }> {
  await connectDB();

  const session = await Session.findOne({
    sessionId,
    userId: user.id,
  }).exec();

  if (!session) {
    return { success: false, message: 'Session not found' };
  }

  await Session.deleteOne({ sessionId });
  return { success: true };
}

export async function terminateOtherSessions(
  user: CurrentUser
): Promise<number> {
  await connectDB();
  const result = await Session.deleteMany({
    userId: user.id,
    sessionId: { $ne: user.sessionId },
  });
  return result.deletedCount || 0;
}
