/**
 * HOUSEYE.COM — Create Floor
 * Owner only (structure authority)
 */

import { connectDB } from '@/lib/db/connect';
import { Property, Floor } from '@/models';
import { CurrentUser } from '@/lib/auth/get-session';
import { isOwner, isSuperAdmin } from '@/services/authorization';
import { requireActiveSubscription } from '@/services/authorization';

export interface CreateFloorInput {
  propertyId: string;
  name: string;
  blockId?: string;
  buildingId?: string;
  sortOrder?: number;
}

export async function createFloor(
  user: CurrentUser,
  input: CreateFloorInput
): Promise<
  | { success: true; floor: Record<string, unknown> }
  | { success: false; code: string; message: string }
> {
  if (!isOwner(user) && !isSuperAdmin(user)) {
    return {
      success: false,
      code: 'FORBIDDEN',
      message: 'Only the Owner can create floors',
    };
  }

  if (!user.accountId) {
    return { success: false, code: 'FORBIDDEN', message: 'No account context' };
  }

  const sub = requireActiveSubscription(user);
  if (!sub.allowed) {
    return { success: false, code: sub.code, message: sub.message };
  }

  const name = input.name?.trim();
  if (!name) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Floor name is required',
    };
  }

  await connectDB();

  const property = await Property.findOne({
    _id: input.propertyId,
    accountId: user.accountId,
    deletedAt: null,
  }).exec();

  if (!property) {
    return { success: false, code: 'NOT_FOUND', message: 'Property not found' };
  }

  const floor = await Floor.create({
    accountId: user.accountId,
    propertyId: input.propertyId,
    blockId: input.blockId || undefined,
    buildingId: input.buildingId || undefined,
    name,
    sortOrder: input.sortOrder ?? 0,
    createdBy: user.id,
  });

  return {
    success: true,
    floor: {
      id: floor._id.toString(),
      name: floor.name,
      propertyId: floor.propertyId.toString(),
      sortOrder: floor.sortOrder,
    },
  };
}
