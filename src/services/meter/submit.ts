/**
 * HOUSEYE.COM — Submit meter reading
 */

import { connectDB } from '@/lib/db/connect';
import { MeterReading, Unit, Account, Tenancy } from '@/models';
import { CurrentUser } from '@/lib/auth/get-session';
import {
  isOwner,
  isSuperAdmin,
  hasPermission,
  hasPropertyScope,
} from '@/services/authorization';
import { PERMISSIONS } from '@/constants/permissions';

export interface SubmitMeterInput {
  unitId: string;
  reading: number;
  readingDate?: string;
  notes?: string;
}

export async function submitMeterReading(
  actor: CurrentUser,
  input: SubmitMeterInput
): Promise<
  | { success: true; reading: Record<string, unknown> }
  | { success: false; code: string; message: string }
> {
  const canSubmit =
    isOwner(actor) ||
    isSuperAdmin(actor) ||
    hasPermission(actor, PERMISSIONS.METER_SUBMIT);

  if (!canSubmit) {
    return {
      success: false,
      code: 'FORBIDDEN',
      message: "You don't have permission to submit meter readings",
    };
  }

  if (input.reading == null || input.reading < 0) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Valid reading is required',
    };
  }

  await connectDB();

  const unit = await Unit.findOne({
    _id: input.unitId,
    deletedAt: null,
  }).exec();

  if (!unit) {
    return { success: false, code: 'NOT_FOUND', message: 'Unit not found' };
  }

  if (
    !isSuperAdmin(actor) &&
    unit.accountId.toString() !== actor.accountId
  ) {
    return { success: false, code: 'FORBIDDEN', message: 'Access denied' };
  }

  if (!isOwner(actor) && !isSuperAdmin(actor)) {
    const scope = hasPropertyScope(actor, unit.propertyId.toString());
    if (!scope.allowed) {
      return { success: false, code: scope.code, message: scope.message };
    }
  }

  const account = await Account.findById(unit.accountId)
    .select('subscriptionStatus')
    .exec();
  if (!account || account.subscriptionStatus !== 'ACTIVE') {
    return {
      success: false,
      code: 'SUBSCRIPTION_INACTIVE',
      message: 'Meter readings are blocked while subscription is inactive.',
    };
  }

  const last = await MeterReading.findOne({ unitId: unit._id })
    .sort({ readingDate: -1 })
    .exec();

  if (last && input.reading < last.reading) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: `Reading cannot be less than previous reading (${last.reading}). Use correction flow if needed.`,
    };
  }

  const previousReading = last?.reading;
  const unitsConsumed =
    previousReading != null ? input.reading - previousReading : undefined;

  const tenancy = await Tenancy.findOne({
    unitId: unit._id,
    status: { $in: ['ACTIVE', 'NOTICE'] },
  })
    .select('_id')
    .exec();

  const doc = await MeterReading.create({
    accountId: unit.accountId,
    propertyId: unit.propertyId,
    unitId: unit._id,
    tenancyId: tenancy?._id,
    reading: input.reading,
    previousReading,
    unitsConsumed,
    readingDate: input.readingDate ? new Date(input.readingDate) : new Date(),
    notes: input.notes,
    isCorrection: false,
    createdBy: actor.id,
  });

  return {
    success: true,
    reading: {
      id: doc._id.toString(),
      reading: doc.reading,
      previousReading: doc.previousReading,
      unitsConsumed: doc.unitsConsumed,
      readingDate: doc.readingDate,
      unitId: unit._id.toString(),
    },
  };
}
