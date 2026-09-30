import { connectDB } from '@/lib/db/connect';
import { Notice, Account } from '@/models';
import { CurrentUser } from '@/lib/auth/get-session';
import {
  isOwner,
  isSuperAdmin,
  hasPermission,
  hasPropertyScope,
} from '@/services/authorization';
import { PERMISSIONS } from '@/constants/permissions';

export async function createNotice(
  actor: CurrentUser,
  input: {
    title: string;
    body: string;
    propertyId?: string;
    pinned?: boolean;
    expiresAt?: string;
  }
): Promise<
  | { success: true; notice: Record<string, unknown> }
  | { success: false; code: string; message: string }
> {
  const can =
    isOwner(actor) ||
    isSuperAdmin(actor) ||
    hasPermission(actor, PERMISSIONS.NOTICE_CREATE);

  if (!can) {
    return {
      success: false,
      code: 'FORBIDDEN',
      message: "You don't have permission to create notices",
    };
  }

  if (!input.title?.trim() || !input.body?.trim()) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Title and body are required',
    };
  }

  if (!actor.accountId && !isSuperAdmin(actor)) {
    return { success: false, code: 'FORBIDDEN', message: 'No account context' };
  }

  await connectDB();

  if (input.propertyId && !isOwner(actor) && !isSuperAdmin(actor)) {
    const scope = hasPropertyScope(actor, input.propertyId);
    if (!scope.allowed) {
      return { success: false, code: scope.code, message: scope.message };
    }
  }

  const account = await Account.findById(actor.accountId)
    .select('subscriptionStatus')
    .exec();
  if (!account || account.subscriptionStatus !== 'ACTIVE') {
    return {
      success: false,
      code: 'SUBSCRIPTION_INACTIVE',
      message: 'Notices cannot be published while subscription is inactive.',
    };
  }

  const notice = await Notice.create({
    accountId: actor.accountId,
    propertyId: input.propertyId || undefined,
    title: input.title.trim(),
    body: input.body.trim(),
    pinned: !!input.pinned,
    publishedAt: new Date(),
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
    createdBy: actor.id,
  });

  return {
    success: true,
    notice: {
      id: notice._id.toString(),
      title: notice.title,
      pinned: notice.pinned,
      publishedAt: notice.publishedAt,
    },
  };
}
