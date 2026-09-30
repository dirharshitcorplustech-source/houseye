/**
 * HOUSEYE.COM — Create Primary Tenant + Tenancy (move-in)
 * - Creates Tenancy record
 * - Creates Tenant User (PENDING_INVITATION)
 * - Updates Unit → OCCUPIED
 * - Consumes primaryTenant capacity
 * - Prevents second ACTIVE tenancy on same unit
 */

import mongoose from 'mongoose';
import { connectDB } from '@/lib/db/connect';
import { Unit, Tenancy, User, Account, Property } from '@/models';
import { CurrentUser } from '@/lib/auth/get-session';
import {
  isOwner,
  isSuperAdmin,
  hasPermission,
  hasPropertyScope,
} from '@/services/authorization';
import { canConsume } from '@/services/entitlement';
import { generateUsername } from '@/lib/utils/username';
import { PERMISSIONS } from '@/constants/permissions';
import { hashPassword } from '@/lib/auth/password';
import { nanoid } from 'nanoid';

export interface CreateTenancyInput {
  propertyId: string;
  unitId: string;
  fullName: string;
  mobile?: string;
  email?: string;
  rent: number;
  securityDeposit?: number;
  startDate: string; // ISO date
  occupants?: Array<{
    fullName: string;
    relation?: string;
    mobile?: string;
    isEmergencyContact?: boolean;
  }>;
}

export async function createTenancy(
  actor: CurrentUser,
  input: CreateTenancyInput
): Promise<
  | {
      success: true;
      tenancy: Record<string, unknown>;
      tenant: Record<string, unknown>;
      inviteLink: string;
    }
  | { success: false; code: string; message: string }
> {
  if (!actor.accountId) {
    return { success: false, code: 'FORBIDDEN', message: 'No account context' };
  }

  const canCreate =
    isOwner(actor) ||
    isSuperAdmin(actor) ||
    hasPermission(actor, PERMISSIONS.TENANT_CREATE);

  if (!canCreate) {
    return {
      success: false,
      code: 'FORBIDDEN',
      message: "You don't have permission to add tenants",
    };
  }

  if (!isOwner(actor) && !isSuperAdmin(actor)) {
    const scope = hasPropertyScope(actor, input.propertyId);
    if (!scope.allowed) {
      return { success: false, code: scope.code, message: scope.message };
    }
  }

  const fullName = input.fullName?.trim();
  if (!fullName) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Tenant full name is required',
    };
  }

  if (!input.rent || input.rent <= 0) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Valid rent amount is required',
    };
  }

  const startDate = new Date(input.startDate);
  if (isNaN(startDate.getTime())) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Valid start date is required',
    };
  }

  const entitlement = await canConsume(actor.accountId, 'primaryTenants', 1);
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
    accountId: actor.accountId,
    deletedAt: null,
  }).exec();

  if (!property) {
    return { success: false, code: 'NOT_FOUND', message: 'Property not found' };
  }

  const unit = await Unit.findOne({
    _id: input.unitId,
    propertyId: input.propertyId,
    accountId: actor.accountId,
    deletedAt: null,
  }).exec();

  if (!unit) {
    return { success: false, code: 'NOT_FOUND', message: 'Unit not found' };
  }

  if (unit.vacancyStatus === 'OCCUPIED') {
    // Double-check active tenancy
    const active = await Tenancy.findOne({
      unitId: unit._id,
      status: 'ACTIVE',
    }).exec();
    if (active) {
      return {
        success: false,
        code: 'CONFLICT',
        message: 'This unit already has an active primary tenant',
      };
    }
  }

  let username = generateUsername('TENANT', fullName);
  let attempts = 0;
  while (await User.findOne({ username }).exec()) {
    username = generateUsername('TENANT', fullName);
    attempts++;
    if (attempts > 10) {
      return {
        success: false,
        code: 'USERNAME_GENERATION_FAILED',
        message: 'Could not generate unique username',
      };
    }
  }

  const invitationToken = nanoid(48);
  const passwordHash = await hashPassword(nanoid(32));

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const [tenantUser] = await User.create(
      [
        {
          accountId: actor.accountId,
          role: 'TENANT',
          username,
          email: input.email?.toLowerCase().trim(),
          mobile: input.mobile?.trim(),
          passwordHash,
          fullName,
          status: 'PENDING_INVITATION',
          invitationToken,
          invitationSentAt: new Date(),
          createdBy: actor.id,
          isEmailVerified: false,
          isMobileVerified: false,
          failedLoginAttempts: 0,
          mfaEnabled: false,
          permissions: [],
        },
      ],
      { session }
    );

    const [tenancy] = await Tenancy.create(
      [
        {
          accountId: actor.accountId,
          propertyId: input.propertyId,
          blockId: unit.blockId,
          buildingId: unit.buildingId,
          floorId: unit.floorId,
          unitId: unit._id,
          primaryTenantUserId: tenantUser._id,
          fullName,
          mobile: input.mobile?.trim(),
          email: input.email?.toLowerCase().trim(),
          status: 'ACTIVE',
          startDate,
          moveInDate: startDate,
          rent: input.rent,
          securityDeposit: input.securityDeposit,
          securityDepositDate: input.securityDeposit
            ? startDate
            : undefined,
          createdBy: actor.id,
        },
      ],
      { session }
    );

    // Link tenancy on user
    await User.updateOne(
      { _id: tenantUser._id },
      { tenancyId: tenancy._id },
      { session }
    );

    // Update unit
    await Unit.updateOne(
      { _id: unit._id },
      {
        vacancyStatus: 'OCCUPIED',
        vacancyStartDate: undefined,
        currentResidentCount:
          1 + (input.occupants?.length || 0),
      },
      { session }
    );

    // Occupants
    if (input.occupants && input.occupants.length > 0) {
      const Occupant = (await import('@/models/Occupant')).default;
      await Occupant.insertMany(
        input.occupants.map((o) => ({
          accountId: actor.accountId,
          tenancyId: tenancy._id,
          unitId: unit._id,
          fullName: o.fullName.trim(),
          relation: o.relation,
          mobile: o.mobile,
          isEmergencyContact: o.isEmergencyContact || false,
        })),
        { session }
      );
    }

    await Account.updateOne(
      { _id: actor.accountId },
      { $inc: { 'usage.primaryTenants': 1 } },
      { session }
    );

    await session.commitTransaction();

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteLink = `${baseUrl}/accept-invite?token=${invitationToken}`;

    return {
      success: true,
      tenancy: {
        id: tenancy._id.toString(),
        unitId: unit._id.toString(),
        fullName: tenancy.fullName,
        status: tenancy.status,
        rent: tenancy.rent,
        startDate: tenancy.startDate,
      },
      tenant: {
        id: tenantUser._id.toString(),
        username: tenantUser.username,
        status: tenantUser.status,
      },
      inviteLink,
    };
  } catch (err: unknown) {
    await session.abortTransaction();
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: number }).code === 11000
    ) {
      return {
        success: false,
        code: 'CONFLICT',
        message: 'This unit already has an active primary tenant',
      };
    }
    console.error('[Houseye] createTenancy error:', err);
    return {
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to create tenancy',
    };
  } finally {
    session.endSession();
  }
}
