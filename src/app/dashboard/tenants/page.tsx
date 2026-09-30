/**
 * HOUSEYE.COM — Tenants list
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/get-session';
import { connectDB } from '@/lib/db/connect';
import { Tenancy, Unit, Property } from '@/models';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { isSuperAdmin } from '@/services/authorization';

export default async function TenantsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role === 'TENANT') redirect('/tenant');
  if (user.isSuperAdmin) redirect('/admin');

  await connectDB();

  const filter: Record<string, unknown> = { status: 'ACTIVE' };
  if (!isSuperAdmin(user)) filter.accountId = user.accountId;
  if (
    user.role === 'MANAGER' &&
    user.propertyScopes?.length
  ) {
    filter.propertyId = { $in: user.propertyScopes };
  }

  const tenancies = await Tenancy.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const unitIds = tenancies.map((t) => t.unitId);
  const propertyIds = tenancies.map((t) => t.propertyId);

  const [units, properties] = await Promise.all([
    Unit.find({ _id: { $in: unitIds } }).select('unitNumber').lean(),
    Property.find({ _id: { $in: propertyIds } }).select('name').lean(),
  ]);

  const unitMap = Object.fromEntries(
    units.map((u) => [u._id.toString(), u.unitNumber])
  );
  const propMap = Object.fromEntries(
    properties.map((p) => [p._id.toString(), p.name])
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <Link href="/dashboard" className="font-bold text-houseye-primary text-lg">
              Houseye
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">Tenants</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/tenants/new"
              className="text-sm bg-houseye-primary text-white px-3 py-1.5 rounded-lg hover:bg-blue-800"
            >
              Add tenant
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900">Active tenants</h1>
        <p className="text-sm text-slate-500 mt-1">
          {tenancies.length} active tenanc{tenancies.length === 1 ? 'y' : 'ies'}
        </p>

        <div className="mt-6 overflow-x-auto">
          {tenancies.length === 0 ? (
            <div className="bg-white border rounded-xl p-10 text-center text-slate-500">
              No active tenants yet.
              <div className="mt-3">
                <Link
                  href="/dashboard/tenants/new"
                  className="text-houseye-primary font-medium hover:underline"
                >
                  Add first tenant
                </Link>
              </div>
            </div>
          ) : (
            <table className="w-full text-sm bg-white border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Tenant</th>
                  <th className="px-4 py-3 font-medium">Property</th>
                  <th className="px-4 py-3 font-medium">Unit</th>
                  <th className="px-4 py-3 font-medium">Rent</th>
                  <th className="px-4 py-3 font-medium">Since</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {tenancies.map((t) => (
                  <tr key={t._id.toString()} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {t.fullName}
                      {t.mobile && (
                        <div className="text-xs text-slate-400 font-normal">
                          {t.mobile}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {propMap[t.propertyId.toString()] || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {unitMap[t.unitId.toString()] || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      ₹{Number(t.rent).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(t.startDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/tenants/${t._id.toString()}`}
                        className="text-houseye-primary hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
