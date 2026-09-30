/**
 * HOUSEYE.COM — Create Property
 * Only Owner can create property structure.
 * Requires active subscription + property entitlement.
 */

import mongoose from 'mongoose';
import { connectDB } from '@/lib/db/connect';
import { Property, Account } from '@/models';
import { CurrentUser } from '@/lib/auth/get-session';
import { isOwner, isSuperAdmin } from '@/services/authorization';
import { canConsume, incrementUsage } from '@/services/entitlement';
import { PropertyType } from '@/models/Property';

export interface CreatePropertyInput {
  name: string;
  propertyType: PropertyType;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pin?: string;
  };
  notes?: string;
}

export async function createProperty(
  user: CurrentUser,
  input: CreatePropertyInput
): Promise<
  | { success: true; property: Record<string, unknown> }
  | { success: false; code: string; message: string }
> {
  if (!isOwner(user) && !isSuperAdmin(user)) {
    return {
      success: false,
      code: 'FORBIDDEN',
      message: 'Only the Owner can create property structure',
    };
  }

  if (!user.accountId) {
    return {
      success: false,
      code: 'FORBIDDEN',
      message: 'No account context',
    };
  }

  const name = input.name?.trim();
  if (!name || name.length < 1) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Property name is required',
    };
  }

  const validTypes: PropertyType[] = ['RESIDENTIAL', 'COMMERCIAL', 'MIXED_USE'];
  if (!validTypes.includes(input.propertyType)) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Invalid property type',
    };
  }

  // Entitlement check
  const entitlement = await canConsume(user.accountId, 'properties', 1);
  if (!entitlement.ok) {
    return {
      success: false,
      code: entitlement.code,
      message: entitlement.message,
    };
  }

  await connectDB();

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Re-check inside transaction against account usage to reduce race
    const account = await Account.findById(user.accountId)
      .session(session)
      .exec();
    if (!account) {
      await session.abortTransaction();
      return {
        success: false,
        code: 'ACCOUNT_NOT_FOUND',
        message: 'Account not found',
      };
    }

    if (account.subscriptionStatus !== 'ACTIVE') {
      await session.abortTransaction();
      return {
        success: false,
        code: 'SUBSCRIPTION_INACTIVE',
        message:
          account.subscriptionStatus === 'EXPLORE'
            ? 'This action requires an active subscription. Choose a plan to continue.'
            : 'Your subscription is inactive. Activate your plan to perform this action.',
      };
    }

    const [property] = await Property.create(
      [
        {
          accountId: user.accountId,
          name,
          propertyType: input.propertyType,
          address: input.address,
          notes: input.notes,
          createdBy: user.id,
          isArchived: false,
        },
      ],
      { session }
    );

    await Account.updateOne(
      { _id: user.accountId },
      { $inc: { 'usage.properties': 1 } },
      { session }
    );

    await session.commitTransaction();

    return {
      success: true,
      property: {
        id: property._id.toString(),
        name: property.name,
        propertyType: property.propertyType,
        address: property.address,
        createdAt: property.createdAt,
      },
    };
  } catch (err) {
    await session.abortTransaction();
    console.error('[Houseye] createProperty error:', err);
    return {
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to create property',
    };
  } finally {
    session.endSession();
  }
}
