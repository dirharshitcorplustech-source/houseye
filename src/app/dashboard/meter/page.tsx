/**
 * HOUSEYE.COM — Meter readings UI
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/get-session';
import { connectDB } from '@/lib/db/connect';
import { MeterReading, Unit, Property } from '@/models';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { SubmitMeterForm } from '@/components/forms/SubmitMeterForm';

export default async function MeterPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role === 'TENANT') redirect('/tenant');
  if (user.isSuperAdmin) redirect('/admin');

  await connectDB();

  const unitFilter: Record<string, unknown> = {
    accountId: user.accountId,
    deletedAt: null,
  };
  if (user.role === 'MANAGER' && user.propertyScopes?.length) {
    unitFilter.propertyId = { $in: user.propertyScopes };
  }

  const [units, properties, readings] = await Promise.all([
    Unit.find(unitFilter).select('unitNumber propertyId').sort({ unitNumber: 1 }).lean(),
    Property.find({ accountId: user.accountId, deletedAt: null }).select('name').lean(),
    MeterReading.find({ accountId: user.accountId })
      .sort({ readingDate: -1 })
      .limit(40)
      .lean(),
  ]);

  const propMap = Object.fromEntries(properties.map((p) => [p._id.toString(), p.name]));
  const unitMap = Object.fromEntries(
    units.map((u) => [u._id.toString(), u.unitNumber])
  );

  const canSubmit =
    (user.role === 'OWNER' ||
      user.permissions.includes('meter:submit')) &&
    user.subscriptionStatus === 'ACTIVE';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <Link href="/dashboard" className="font-bold text-houseye-primary text-lg">
              Houseye
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">Meter readings</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Meter readings</h1>
          <p className="text-sm text-slate-500 mt-1">
            Submit readings; new value must be ≥ previous.
          </p>
        </div>

        {canSubmit && (
          <SubmitMeterForm
            units={units.map((u) => ({
              id: u._id.toString(),
              label: `${propMap[u.propertyId.toString()] || 'Property'} · Unit ${u.unitNumber}`,
            }))}
          />
        )}

        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Reading</th>
                <th className="px-4 py-3">Previous</th>
                <th className="px-4 py-3">Units used</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {readings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No readings yet
                  </td>
                </tr>
              ) : (
                readings.map((r) => (
                  <tr key={r._id.toString()} className="border-t">
                    <td className="px-4 py-3">
                      {unitMap[r.unitId.toString()] || r.unitId.toString().slice(-6)}
                    </td>
                    <td className="px-4 py-3 font-medium">{r.reading}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {r.previousReading ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {r.unitsConsumed ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(r.readingDate).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
