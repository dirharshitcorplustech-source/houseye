/**
 * HOUSEYE.COM — Tenant Portal shell
 */

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/get-session';
import { connectDB } from '@/lib/db/connect';
import { Tenancy, Unit, Property } from '@/models';
import Link from 'next/link';
import { LogoutButton } from '@/components/auth/LogoutButton';

export default async function TenantPortalPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'TENANT') redirect('/dashboard');

  await connectDB();

  let tenancy = null;
  let unit = null;
  let property = null;

  // Find active tenancy for this user
  tenancy = await Tenancy.findOne({
    primaryTenantUserId: user.id,
    status: { $in: ['ACTIVE', 'NOTICE'] },
  }).lean();

  if (tenancy) {
    [unit, property] = await Promise.all([
      Unit.findById(tenancy.unitId).select('unitNumber').lean(),
      Property.findById(tenancy.propertyId).select('name').lean(),
    ]);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="font-bold text-houseye-primary">Houseye</div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">{user.fullName}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-xl font-bold text-slate-900">Tenant portal</h1>

        {!tenancy ? (
          <div className="mt-6 bg-white border rounded-xl p-6 text-sm text-slate-600">
            No active tenancy found. If you recently moved out, your portal access
            is closed. Contact your property manager for historical records.
          </div>
        ) : (
          <>
            <div className="mt-4 bg-white border rounded-xl p-4 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Property</span>
                <span className="font-medium">{property?.name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Unit</span>
                <span className="font-medium">{unit?.unitNumber || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Rent</span>
                <span className="font-medium">
                  ₹{Number(tenancy.rent).toLocaleString('en-IN')}/mo
                </span>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              <Link
                href="/tenant/bills"
                className="bg-white border rounded-xl p-4 flex justify-between items-center hover:border-houseye-primary"
              >
                <div>
                  <div className="font-medium text-slate-900">Bills & pay</div>
                  <div className="text-xs text-slate-500">
                    View bills and submit payment proof
                  </div>
                </div>
                <span className="text-xs text-houseye-primary">Open</span>
              </Link>
              <Link
                href="/tenant/maintenance"
                className="bg-white border rounded-xl p-4 flex justify-between items-center hover:border-houseye-primary"
              >
                <div>
                  <div className="font-medium text-slate-900">Maintenance</div>
                  <div className="text-xs text-slate-500">Raise a request</div>
                </div>
                <span className="text-xs text-houseye-primary">Open</span>
              </Link>
              <Link
                href="/tenant/notices"
                className="bg-white border rounded-xl p-4 flex justify-between items-center hover:border-houseye-primary"
              >
                <div>
                  <div className="font-medium text-slate-900">Notices</div>
                  <div className="text-xs text-slate-500">Building announcements</div>
                </div>
                <span className="text-xs text-houseye-primary">Open</span>
              </Link>
              <Link
                href="/tenant/notifications"
                className="bg-white border rounded-xl p-4 flex justify-between items-center hover:border-houseye-primary"
              >
                <div>
                  <div className="font-medium text-slate-900">Notifications</div>
                  <div className="text-xs text-slate-500">Payment & maintenance alerts</div>
                </div>
                <span className="text-xs text-houseye-primary">Open</span>
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
