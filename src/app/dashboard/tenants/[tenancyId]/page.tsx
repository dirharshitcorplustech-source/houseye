/**
 * HOUSEYE.COM — Tenancy detail + move-out
 */

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/get-session';
import { connectDB } from '@/lib/db/connect';
import { Tenancy, Unit, Property } from '@/models';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { MoveOutButton } from '@/components/forms/MoveOutButton';
import { isSuperAdmin } from '@/services/authorization';

export default async function TenancyDetailPage({
  params,
}: {
  params: { tenancyId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role === 'TENANT') redirect('/tenant');

  await connectDB();

  const tenancy = await Tenancy.findById(params.tenancyId).lean();
  if (!tenancy) notFound();

  if (
    !isSuperAdmin(user) &&
    tenancy.accountId.toString() !== user.accountId
  ) {
    redirect('/dashboard/tenants');
  }

  const [unit, property] = await Promise.all([
    Unit.findById(tenancy.unitId).select('unitNumber').lean(),
    Property.findById(tenancy.propertyId).select('name').lean(),
  ]);

  const canMoveOut =
    (user.role === 'OWNER' ||
      user.permissions.includes('tenant:move_out')) &&
    (tenancy.status === 'ACTIVE' || tenancy.status === 'NOTICE');

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <Link href="/dashboard" className="font-bold text-houseye-primary text-lg">
              Houseye
            </Link>
            <span className="text-slate-300">/</span>
            <Link href="/dashboard/tenants" className="text-slate-600 hover:text-slate-900">
              Tenants
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">{tenancy.fullName}</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900">{tenancy.fullName}</h1>
        <p className="text-sm text-slate-500 mt-1">
          Status:{' '}
          <span className="font-medium text-slate-800">{tenancy.status}</span>
        </p>

        <div className="mt-6 bg-white border rounded-xl divide-y">
          <Row label="Property" value={property?.name || '—'} />
          <Row label="Unit" value={unit?.unitNumber || '—'} />
          <Row
            label="Rent"
            value={`₹${Number(tenancy.rent).toLocaleString('en-IN')}/month`}
          />
          <Row
            label="Security deposit"
            value={
              tenancy.securityDeposit
                ? `₹${Number(tenancy.securityDeposit).toLocaleString('en-IN')}`
                : '—'
            }
          />
          <Row
            label="Start date"
            value={new Date(tenancy.startDate).toLocaleDateString('en-IN')}
          />
          {tenancy.moveOutDate && (
            <Row
              label="Move-out date"
              value={new Date(tenancy.moveOutDate).toLocaleDateString('en-IN')}
            />
          )}
          <Row label="Mobile" value={tenancy.mobile || '—'} />
          <Row label="Email" value={tenancy.email || '—'} />
        </div>

        {canMoveOut && (
          <div className="mt-8">
            <MoveOutButton tenancyId={params.tenancyId} />
          </div>
        )}
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between px-4 py-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-900 font-medium">{value}</span>
    </div>
  );
}
