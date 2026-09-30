/**
 * HOUSEYE.COM — Owner/staff dashboard summary stats
 */

import { connectDB } from '@/lib/db/connect';
import {
  Property,
  Unit,
  Tenancy,
  Bill,
  Payment,
  MaintenanceRequest,
} from '@/models';
import { CurrentUser } from '@/lib/auth/get-session';
import { isSuperAdmin } from '@/services/authorization';

export async function getDashboardStats(user: CurrentUser) {
  await connectDB();

  if (!user.accountId && !isSuperAdmin(user)) {
    return null;
  }

  const accountFilter = isSuperAdmin(user)
    ? {}
    : { accountId: user.accountId };

  const propertyScope =
    user.role === 'MANAGER' && user.propertyScopes?.length
      ? { propertyId: { $in: user.propertyScopes } }
      : {};

  const base = { ...accountFilter, ...propertyScope };

  const [
    properties,
    units,
    vacantUnits,
    activeTenants,
    openBills,
    pendingPayments,
    openMaintenance,
  ] = await Promise.all([
    Property.countDocuments({ ...accountFilter, deletedAt: null }),
    Unit.countDocuments({ ...base, deletedAt: null }),
    Unit.countDocuments({
      ...base,
      deletedAt: null,
      vacancyStatus: 'VACANT',
    }),
    Tenancy.countDocuments({
      ...accountFilter,
      status: 'ACTIVE',
      ...(propertyScope.propertyId
        ? { propertyId: propertyScope.propertyId }
        : {}),
    }),
    Bill.countDocuments({
      ...accountFilter,
      status: { $in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] },
    }),
    Payment.countDocuments({
      ...accountFilter,
      status: 'SUBMITTED',
    }),
    MaintenanceRequest.countDocuments({
      ...accountFilter,
      status: { $nin: ['CLOSED', 'RESOLVED'] },
      ...(propertyScope.propertyId
        ? { propertyId: propertyScope.propertyId }
        : {}),
    }),
  ]);

  return {
    properties,
    units,
    vacantUnits,
    occupiedUnits: units - vacantUnits,
    activeTenants,
    openBills,
    pendingPayments,
    openMaintenance,
  };
}
