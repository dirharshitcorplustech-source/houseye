/**
 * HOUSEYE.COM — List Properties
 * Filtered by account + Manager/Admin scope
 */

import { connectDB } from '@/lib/db/connect';
import { Property } from '@/models';
import { CurrentUser } from '@/lib/auth/get-session';
import { isOwner, isSuperAdmin } from '@/services/authorization';

export async function listProperties(user: CurrentUser): Promise<{
  success: true;
  properties: Array<Record<string, unknown>>;
}> {
  await connectDB();

  if (!user.accountId && !isSuperAdmin(user)) {
    return { success: true, properties: [] };
  }

  const filter: Record<string, unknown> = {
    deletedAt: null,
  };

  if (!isSuperAdmin(user)) {
    filter.accountId = user.accountId;
  }

  // Manager / scoped Admin: only assigned properties
  if (
    !isOwner(user) &&
    !isSuperAdmin(user) &&
    user.propertyScopes &&
    user.propertyScopes.length > 0
  ) {
    filter._id = { $in: user.propertyScopes };
  }

  // If Manager with empty scopes → no properties
  if (
    user.role === 'MANAGER' &&
    (!user.propertyScopes || user.propertyScopes.length === 0)
  ) {
    return { success: true, properties: [] };
  }

  const docs = await Property.find(filter)
    .sort({ createdAt: -1 })
    .select('name propertyType address isArchived createdAt')
    .lean()
    .exec();

  const properties = docs.map((p) => ({
    id: p._id.toString(),
    name: p.name,
    propertyType: p.propertyType,
    address: p.address,
    isArchived: p.isArchived,
    createdAt: p.createdAt,
  }));

  return { success: true, properties };
}
