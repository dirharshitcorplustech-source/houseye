/**
 * HOUSEYE.COM — Soft delete (Trash)
 * No permanent delete for normal records.
 * Owner + Super Admin only for structure.
 */

import { connectDB } from '@/lib/db/connect';
import { Property, Unit, Floor, Block, Building } from '@/models';
import { CurrentUser } from '@/lib/auth/get-session';
import { isOwner, isSuperAdmin } from '@/services/authorization';
import { decrementUsage } from '@/services/entitlement';
import mongoose from 'mongoose';
import { writeAuditLog } from '@/services/audit/write';

export type TrashableType = 'property' | 'unit' | 'floor' | 'block' | 'building';

export async function softDelete(
  actor: CurrentUser,
  type: TrashableType,
  id: string
): Promise<
  | { success: true }
  | { success: false; code: string; message: string }
> {
  if (!isOwner(actor) && !isSuperAdmin(actor)) {
    return {
      success: false,
      code: 'FORBIDDEN',
      message: 'Only the Owner can move structure records to Trash',
    };
  }

  if (!actor.accountId && !isSuperAdmin(actor)) {
    return { success: false, code: 'FORBIDDEN', message: 'No account context' };
  }

  await connectDB();

  const deletedAt = new Date();
  const deletedBy = new mongoose.Types.ObjectId(actor.id);

  if (type === 'property') {
    const prop = await Property.findById(id).exec();
    if (!prop || prop.deletedAt) {
      return { success: false, code: 'NOT_FOUND', message: 'Property not found' };
    }
    if (
      !isSuperAdmin(actor) &&
      prop.accountId.toString() !== actor.accountId
    ) {
      return { success: false, code: 'FORBIDDEN', message: 'Access denied' };
    }

    // Soft-delete property + cascade mark units/floors (not permanent)
    prop.deletedAt = deletedAt;
    prop.deletedBy = deletedBy;
    await prop.save();

    await Unit.updateMany(
      { propertyId: id, deletedAt: null },
      { deletedAt, deletedBy }
    );
    await Floor.updateMany(
      { propertyId: id, deletedAt: null },
      { deletedAt, deletedBy }
    );
    await Block.updateMany(
      { propertyId: id, deletedAt: null },
      { deletedAt, deletedBy }
    );
    await Building.updateMany(
      { propertyId: id, deletedAt: null },
      { deletedAt, deletedBy }
    );

    // Adjust usage — count units that were active
    const unitCount = await Unit.countDocuments({
      propertyId: id,
      deletedAt,
    });
    if (actor.accountId) {
      await decrementUsage(actor.accountId, 'properties', 1);
      if (unitCount > 0) {
        await decrementUsage(actor.accountId, 'units', unitCount);
      }
    }

    await writeAuditLog({
      accountId: actor.accountId || undefined,
      actorUserId: actor.id,
      actorRole: actor.role,
      action: 'trash.property',
      entityType: 'Property',
      entityId: id,
    });

    return { success: true };
  }

  if (type === 'unit') {
    const unit = await Unit.findById(id).exec();
    if (!unit || unit.deletedAt) {
      return { success: false, code: 'NOT_FOUND', message: 'Unit not found' };
    }
    if (
      !isSuperAdmin(actor) &&
      unit.accountId.toString() !== actor.accountId
    ) {
      return { success: false, code: 'FORBIDDEN', message: 'Access denied' };
    }
    if (unit.vacancyStatus === 'OCCUPIED') {
      return {
        success: false,
        code: 'CONFLICT',
        message: 'Cannot trash an occupied unit. Move out the tenant first.',
      };
    }
    unit.deletedAt = deletedAt;
    unit.deletedBy = deletedBy;
    await unit.save();
    if (actor.accountId) {
      await decrementUsage(actor.accountId, 'units', 1);
    }
    return { success: true };
  }

  if (type === 'floor') {
    const floor = await Floor.findById(id).exec();
    if (!floor || floor.deletedAt) {
      return { success: false, code: 'NOT_FOUND', message: 'Floor not found' };
    }
    if (
      !isSuperAdmin(actor) &&
      floor.accountId.toString() !== actor.accountId
    ) {
      return { success: false, code: 'FORBIDDEN', message: 'Access denied' };
    }
    floor.deletedAt = deletedAt;
    floor.deletedBy = deletedBy;
    await floor.save();
    return { success: true };
  }

  return {
    success: false,
    code: 'VALIDATION_ERROR',
    message: 'Unsupported trash type',
  };
}

export async function restoreFromTrash(
  actor: CurrentUser,
  type: TrashableType,
  id: string
): Promise<
  | { success: true }
  | { success: false; code: string; message: string }
> {
  if (!isOwner(actor) && !isSuperAdmin(actor)) {
    return {
      success: false,
      code: 'FORBIDDEN',
      message: 'Only the Owner can restore from Trash',
    };
  }

  await connectDB();

  if (type === 'unit') {
    const unit = await Unit.findById(id).exec();
    if (!unit || !unit.deletedAt) {
      return {
        success: false,
        code: 'NOT_FOUND',
        message: 'Trashed unit not found',
      };
    }
    if (
      !isSuperAdmin(actor) &&
      unit.accountId.toString() !== actor.accountId
    ) {
      return { success: false, code: 'FORBIDDEN', message: 'Access denied' };
    }

    // Conflict: same unit number active?
    const conflict = await Unit.findOne({
      propertyId: unit.propertyId,
      unitNumber: unit.unitNumber,
      deletedAt: null,
    }).exec();
    if (conflict) {
      return {
        success: false,
        code: 'CONFLICT',
        message:
          'Cannot restore: a unit with this number already exists. Do not overwrite.',
      };
    }

    unit.deletedAt = undefined;
    unit.deletedBy = undefined;
    await unit.save();

    if (actor.accountId) {
      const { incrementUsage } = await import('@/services/entitlement');
      await incrementUsage(actor.accountId, 'units', 1);
    }
    return { success: true };
  }

  if (type === 'property') {
    const prop = await Property.findById(id).exec();
    if (!prop || !prop.deletedAt) {
      return {
        success: false,
        code: 'NOT_FOUND',
        message: 'Trashed property not found',
      };
    }
    if (
      !isSuperAdmin(actor) &&
      prop.accountId.toString() !== actor.accountId
    ) {
      return { success: false, code: 'FORBIDDEN', message: 'Access denied' };
    }
    prop.deletedAt = undefined;
    prop.deletedBy = undefined;
    await prop.save();
    // Restore child records deleted in same cascade window is complex;
    // restore property only; units restored individually
    if (actor.accountId) {
      const { incrementUsage } = await import('@/services/entitlement');
      await incrementUsage(actor.accountId, 'properties', 1);
    }
    return { success: true };
  }

  return {
    success: false,
    code: 'VALIDATION_ERROR',
    message: 'Unsupported restore type',
  };
}
