/**
 * HOUSEYE.COM — Generate bill for a tenancy / period
 */

import { connectDB } from '@/lib/db/connect';
import { Bill, Tenancy, Unit, Property, Account } from '@/models';
import { CurrentUser } from '@/lib/auth/get-session';
import {
  isOwner,
  isSuperAdmin,
  hasPermission,
  hasPropertyScope,
  requireActiveSubscription,
} from '@/services/authorization';
import { PERMISSIONS } from '@/constants/permissions';
import { nanoid } from 'nanoid';
import { writeAuditLog } from '@/services/audit/write';
import { dispatchNotification } from '@/services/notifications/dispatch';
import { NOTIFICATION_TYPES } from '@/constants/notifications';
import { IBillLine } from '@/models/Bill';

export interface GenerateBillInput {
  tenancyId: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  dueDate: string;
  electricityAmount?: number;
  waterAmount?: number;
  fineAmount?: number;
  previousDue?: number;
  maintenanceAmount?: number;
  maintenanceRecovery?: number;
  notes?: string;
}

function generateBillNumber(): string {
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `HY-${y}${m}-${nanoid(8).toUpperCase()}`;
}

export async function generateBill(
  actor: CurrentUser,
  input: GenerateBillInput
): Promise<
  | { success: true; bill: Record<string, unknown> }
  | { success: false; code: string; message: string }
> {
  if (!actor.accountId && !isSuperAdmin(actor)) {
    return { success: false, code: 'FORBIDDEN', message: 'No account context' };
  }

  const canGenerate =
    isOwner(actor) ||
    isSuperAdmin(actor) ||
    hasPermission(actor, PERMISSIONS.BILL_GENERATE);

  if (!canGenerate) {
    return {
      success: false,
      code: 'FORBIDDEN',
      message: "You don't have permission to generate bills",
    };
  }

  const sub = requireActiveSubscription(actor);
  if (!sub.allowed) {
    return { success: false, code: sub.code, message: sub.message };
  }

  await connectDB();

  const tenancy = await Tenancy.findById(input.tenancyId).exec();
  if (!tenancy) {
    return { success: false, code: 'NOT_FOUND', message: 'Tenancy not found' };
  }

  if (
    !isSuperAdmin(actor) &&
    tenancy.accountId.toString() !== actor.accountId
  ) {
    return { success: false, code: 'FORBIDDEN', message: 'Access denied' };
  }

  if (!isOwner(actor) && !isSuperAdmin(actor)) {
    const scope = hasPropertyScope(actor, tenancy.propertyId.toString());
    if (!scope.allowed) {
      return { success: false, code: scope.code, message: scope.message };
    }
  }

  if (tenancy.status !== 'ACTIVE' && tenancy.status !== 'NOTICE') {
    return {
      success: false,
      code: 'CONFLICT',
      message: 'Can only generate bills for active/notice tenancies',
    };
  }

  const [unit, property] = await Promise.all([
    Unit.findById(tenancy.unitId).exec(),
    Property.findById(tenancy.propertyId).exec(),
  ]);

  const lines: IBillLine[] = [];

  const prevDue = input.previousDue || 0;
  if (prevDue > 0) {
    lines.push({
      key: 'previousDue',
      label: 'Previous Due',
      amount: prevDue,
      paid: 0,
      remaining: prevDue,
    });
  }

  const rent = tenancy.rent;
  lines.push({
    key: 'rent',
    label: 'Rent',
    amount: rent,
    paid: 0,
    remaining: rent,
  });

  if (input.fineAmount && input.fineAmount > 0) {
    lines.push({
      key: 'fine',
      label: 'Fine',
      amount: input.fineAmount,
      paid: 0,
      remaining: input.fineAmount,
    });
  }

  if (input.electricityAmount && input.electricityAmount > 0) {
    lines.push({
      key: 'electricity',
      label: 'Electricity',
      amount: input.electricityAmount,
      paid: 0,
      remaining: input.electricityAmount,
    });
  }

  if (input.waterAmount && input.waterAmount > 0) {
    lines.push({
      key: 'water',
      label: 'Water',
      amount: input.waterAmount,
      paid: 0,
      remaining: input.waterAmount,
    });
  }

  if (input.maintenanceAmount && input.maintenanceAmount > 0) {
    lines.push({
      key: 'maintenance',
      label: 'Maintenance',
      amount: input.maintenanceAmount,
      paid: 0,
      remaining: input.maintenanceAmount,
    });
  }

  if (input.maintenanceRecovery && input.maintenanceRecovery > 0) {
    lines.push({
      key: 'maintenanceRecovery',
      label: 'Maintenance Recovery',
      amount: input.maintenanceRecovery,
      paid: 0,
      remaining: input.maintenanceRecovery,
    });
  }

  const totalAmount = lines.reduce((s, l) => s + l.amount, 0);
  const paymentLinkToken = nanoid(24);

  const bill = await Bill.create({
    accountId: tenancy.accountId,
    propertyId: tenancy.propertyId,
    unitId: tenancy.unitId,
    tenancyId: tenancy._id,
    tenantUserId: tenancy.primaryTenantUserId,
    billNumber: generateBillNumber(),
    billingPeriodStart: new Date(input.billingPeriodStart),
    billingPeriodEnd: new Date(input.billingPeriodEnd),
    dueDate: new Date(input.dueDate),
    issuedAt: new Date(),
    lines,
    totalAmount,
    totalPaid: 0,
    totalRemaining: totalAmount,
    advanceApplied: 0,
    status: 'ISSUED',
    paymentLinkToken,
    paymentLinkActive: true,
    snapshot: {
      propertyName: property?.name,
      unitNumber: unit?.unitNumber,
      tenantName: tenancy.fullName,
      unitType: unit?.unitType,
    },
    notes: input.notes,
    isEditable: true,
    createdBy: actor.id,
  });

  await writeAuditLog({
    accountId: bill.accountId.toString(),
    actorUserId: actor.id,
    actorRole: actor.role,
    action: 'bill.generated',
    entityType: 'Bill',
    entityId: bill._id.toString(),
    metadata: { billNumber: bill.billNumber, totalAmount: bill.totalAmount },
  });

  if (bill.tenantUserId) {
    try {
      await dispatchNotification({
        accountId: bill.accountId.toString(),
        notificationType: NOTIFICATION_TYPES.BILL_GENERATED,
        subject: `New bill ${bill.billNumber}`,
        message: `Bill ${bill.billNumber} for ₹${bill.totalAmount} is due on ${new Date(bill.dueDate).toLocaleDateString('en-IN')}.`,
        recipientUserId: bill.tenantUserId.toString(),
        propertyId: bill.propertyId.toString(),
        unitId: bill.unitId.toString(),
        tenancyId: bill.tenancyId.toString(),
        channels: ['IN_APP', 'EMAIL'],
      });
    } catch (e) {
      console.error('[Houseye] bill notify failed', e);
    }
  }

  return {
    success: true,
    bill: {
      id: bill._id.toString(),
      billNumber: bill.billNumber,
      totalAmount: bill.totalAmount,
      totalRemaining: bill.totalRemaining,
      status: bill.status,
      dueDate: bill.dueDate,
      paymentLinkToken: bill.paymentLinkToken,
      lines: bill.lines,
      snapshot: bill.snapshot,
    },
  };
}
