/**
 * HOUSEYE.COM — Server-side session helper
 * Use in Server Components, Route Handlers, Server Actions
 */

import { cookies } from 'next/headers';
import { connectDB } from '@/lib/db/connect';
import { User, Session, Account } from '@/models';
import { verifyToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { AuthSession, Role } from '@/types';

export interface CurrentUser {
  id: string;
  accountId: string | null;
  role: Role;
  username: string;
  fullName: string;
  email?: string;
  sessionId: string;
  isSuperAdmin: boolean;
  permissions: string[];
  propertyScopes: string[];
  subscriptionStatus?: string;
  planId?: string;
}

/**
 * Returns current authenticated user or null.
 * Verifies JWT + session record + user status + account status.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload?.userId || !payload?.sessionId) return null;

  await connectDB();

  // Session must still exist
  const session = await Session.findOne({
    sessionId: payload.sessionId,
    userId: payload.userId,
  }).exec();

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await Session.deleteOne({ sessionId: payload.sessionId });
    return null;
  }

  // Update last active (fire-and-forget style)
  Session.updateOne(
    { sessionId: payload.sessionId },
    { lastActiveAt: new Date() }
  ).exec();

  const user = await User.findById(payload.userId).exec();
  if (!user) return null;

  if (
    user.status === 'SUSPENDED' ||
    user.status === 'REMOVED' ||
    user.status === 'DEACTIVATED' ||
    user.status === 'PENDING_INVITATION'
  ) {
    return null;
  }

  let subscriptionStatus: string | undefined;
  let planId: string | undefined;

  if (user.accountId) {
    const account = await Account.findById(user.accountId)
      .select('subscriptionStatus planId isSuspended deactivatedAt')
      .exec();

    if (!account || account.deactivatedAt) return null;

    // Non-owner blocked when account suspended
    if (account.isSuspended && user.role !== 'OWNER' && user.role !== 'SUPER_ADMIN') {
      return null;
    }

    subscriptionStatus = account.subscriptionStatus;
    planId = account.planId;
  }

  return {
    id: user._id.toString(),
    accountId: user.accountId?.toString() || null,
    role: user.role,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    sessionId: payload.sessionId,
    isSuperAdmin: user.role === 'SUPER_ADMIN',
    permissions: user.permissions || [],
    propertyScopes: (user.propertyScopes || []).map((id) => id.toString()),
    subscriptionStatus,
    planId,
  };
}

/**
 * Require auth or throw / return null depending on use-case
 */
export async function requireAuth(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}
