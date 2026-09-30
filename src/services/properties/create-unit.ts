/**
 * HOUSEYE.COM — Create Unit
 * Only Owner can add structural units.
 * Requires unit entitlement. Unit numbers unique within property.
 */

import mongoose from 'mongoose';
import { connectDB } from '@/lib/db/connect';
import { Property, Unit, Account } from '@/models';
import { CurrentUser } from '@/lib/auth/get-session';
import { isOwner, isSuperAdmin } from '@/services/authorization';
import { canConsume } from '@/services/entitlement';

export interface CreateUnitInput {
  propertyId: string;
  unitNumber: string;
  unitType?: string;
  floorId?: string;
  blockId?: string;
  buildingId?: string;
  bedrooms?: number;
  bathrooms?: number;
  areaSqft?: number;
  furnishing?: 'UNFURNISHED' | 'SEMI_FURNISHED' | 'FULLY_FURNISHED';
  notes?: string;
}

export async function createUnit(
  user: CurrentUser,
  input: CreateUnitInput
): Promise<
  | { success: true; unit: Record<string, unknown> }
  | { success: false; code: string; message: string }
> {
  if (!isOwner(user) && !isSuperAdmin(user)) {
    return {
      success: false,
      code: 'FORBIDDEN',
      message: 'Only the Owner can create units in the property structure',
    };
  }

  if (!user.accountId) {
    return {
      success: false,
      code: 'FORBIDDEN',
      message: 'No account context',
    };
  }

  const unitNumber = input.unitNumber?.trim();
  if (!unitNumber) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Unit number is required',
    };
  }

  if (!input.propertyId) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Property is required',
    };
  }

  const entitlement = await canConsume(user.accountId, 'units', 1);
  if (!entitlement.ok) {
    return {
      success: false,
      code: entitlement.code,
      message: entitlement.message,
    };
  }

  await connectDB();

  const property = await Property.findOne({
    _id: input.propertyId,
    accountId: user.accountId,
    deletedAt: null,
  }).exec();

  if (!property) {
    return {
      success: false,
      code: 'NOT_FOUND',
      message: 'Property not found',
    };
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const account = await Account.findById(user.accountId).session(session);
    if (!account || account.subscriptionStatus !== 'ACTIVE') {
      await session.abortTransaction();
      return {
        success: false,
        code: 'SUBSCRIPTION_INACTIVE',
        message:
          'Your subscription is inactive. Activate your plan to perform this action.',
      };
    }

    // Duplicate unit number check
    const existing = await Unit.findOne({
      propertyId: input.propertyId,
      unitNumber,
      deletedAt: null,
    })
      .session(session)
      .exec();

    if (existing) {
      await session.abortTransaction();
      return {
        success: false,
        code: 'CONFLICT',
        message: `Unit ${unitNumber} already exists in this property`,
      };
    }

    const [unit] = await Unit.create(
      [
        {
          accountId: user.accountId,
          propertyId: input.propertyId,
          blockId: input.blockId || undefined,
          buildingId: input.buildingId || undefined,
          floorId: input.floorId || undefined,
          unitNumber,
          unitType: input.unitType || 'FLAT',
          bedrooms: input.bedrooms,
          bathrooms: input.bathrooms,
          areaSqft: input.areaSqft,
          furnishing: input.furnishing,
          notes: input.notes,
          vacancyStatus: 'VACANT',
          vacancyStartDate: new Date(),
          currentResidentCount: 0,
          createdBy: user.id,
        },
      ],
      { session }
    );

    await Account.updateOne(
      { _id: user.accountId },
      { $inc: { 'usage.units': 1 } },
      { session }
    );

    await session.commitTransaction();

    return {
      success: true,
      unit: {
        id: unit._id.toString(),
        propertyId: unit.propertyId.toString(),
        unitNumber: unit.unitNumber,
        unitType: unit.unitType,
        vacancyStatus: unit.vacancyStatus,
        createdAt: unit.createdAt,
      },
    };
  } catch (err: unknown) {
    await session.abortTransaction();
    // Handle duplicate key
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: number }).code === 11000
    ) {
      return {
        success: false,
        code: 'CONFLICT',
        message: `Unit ${unitNumber} already exists in this property`,
      };
    }
    console.error('[Houseye] createUnit error:', err);
    return {
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to create unit',
    };
  } finally {
    session.endSession();
  }
}
