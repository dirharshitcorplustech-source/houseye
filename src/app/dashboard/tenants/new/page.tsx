/**
 * HOUSEYE.COM — Add tenant (move-in) form page
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/get-session';
import { connectDB } from '@/lib/db/connect';
import { Property, Unit } from '@/models';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { CreateTenancyForm } from '@/components/forms/CreateTenancyForm';

export default async function NewTenantPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role === 'TENANT') redirect('/tenant');

  await connectDB();

  const filter: Record<string, unknown> = {
    accountId: user.accountId,
    deletedAt: null,
  };
  if (user.role === 'MANAGER' && user.propertyScopes?.length) {
    filter._id = { $in: user.propertyScopes };
  }

  const properties = await Property.find(filter)
    .select('name')
    .lean();

  const propertyIds = properties.map((p) => p._id);
  const vacantUnits = await Unit.find({
    propertyId: { $in: propertyIds },
    vacancyStatus: 'VACANT',
    deletedAt: null,
  })
    .select('unitNumber propertyId')
    .sort({ unitNumber: 1 })
    .lean();

  const propOptions = properties.map((p) => ({
    id: p._id.toString(),
    name: p.name,
  }));

  const unitOptions = vacantUnits.map((u) => ({
    id: u._id.toString(),
    unitNumber: u.unitNumber,
    propertyId: u.propertyId.toString(),
  }));

  const isActive = user.subscriptionStatus === 'ACTIVE';

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
            <span className="text-slate-900 font-medium">Add</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900">Add tenant</h1>
        <p className="text-sm text-slate-500 mt-1">
          Creates tenancy, tenant account (invitation pending), and marks unit occupied.
        </p>

        {!isActive && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-900">
            Active subscription required to add tenants.
          </div>
        )}

        {unitOptions.length === 0 && (
          <div className="mt-4 bg-slate-100 rounded-lg px-4 py-3 text-sm text-slate-600">
            No vacant units available. Create units first under Properties.
          </div>
        )}

        {isActive && unitOptions.length > 0 && (
          <div className="mt-6">
            <CreateTenancyForm properties={propOptions} units={unitOptions} />
          </div>
        )}
      </main>
    </div>
  );
}
