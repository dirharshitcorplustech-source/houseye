/**
 * HOUSEYE.COM — Property detail: floors + units
 */

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/get-session';
import { connectDB } from '@/lib/db/connect';
import { Property, Unit, Floor } from '@/models';
import { isOwner, isSuperAdmin, hasPropertyScope } from '@/services/authorization';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { CreateUnitForm } from '@/components/forms/CreateUnitForm';
import { CreateFloorForm } from '@/components/forms/CreateFloorForm';
import { TrashItemButton } from '@/components/forms/TrashItemButton';

export default async function PropertyDetailPage({
  params,
}: {
  params: { propertyId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role === 'TENANT') redirect('/tenant');

  await connectDB();

  const property = await Property.findOne({
    _id: params.propertyId,
    deletedAt: null,
  }).lean();

  if (!property) notFound();

  if (
    !isSuperAdmin(user) &&
    property.accountId.toString() !== user.accountId
  ) {
    redirect('/dashboard/properties');
  }

  if (!isOwner(user) && !isSuperAdmin(user)) {
    const scope = hasPropertyScope(user, params.propertyId);
    if (!scope.allowed) redirect('/dashboard/properties');
  }

  const [units, floors] = await Promise.all([
    Unit.find({ propertyId: params.propertyId, deletedAt: null })
      .sort({ unitNumber: 1 })
      .lean(),
    Floor.find({ propertyId: params.propertyId, deletedAt: null })
      .sort({ sortOrder: 1, name: 1 })
      .lean(),
  ]);

  const canEditStructure = user.role === 'OWNER' && user.subscriptionStatus === 'ACTIVE';
  const vacant = units.filter((u) => u.vacancyStatus === 'VACANT').length;
  const occupied = units.length - vacant;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <Link href="/dashboard" className="font-bold text-houseye-primary text-lg">
              Houseye
            </Link>
            <span className="text-slate-300">/</span>
            <Link href="/dashboard/properties" className="text-slate-600 hover:text-slate-900">
              Properties
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">{property.name}</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{property.name}</h1>
            <p className="text-sm text-slate-500 mt-1">
              {property.propertyType.replace('_', ' ')}
              {property.address?.city ? ` · ${property.address.city}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm items-center">
            <div className="bg-white border rounded-lg px-3 py-2">
              <span className="text-slate-500">Units</span>{' '}
              <span className="font-semibold">{units.length}</span>
            </div>
            <div className="bg-white border rounded-lg px-3 py-2">
              <span className="text-slate-500">Vacant</span>{' '}
              <span className="font-semibold text-amber-600">{vacant}</span>
            </div>
            <div className="bg-white border rounded-lg px-3 py-2">
              <span className="text-slate-500">Occupied</span>{' '}
              <span className="font-semibold text-green-600">{occupied}</span>
            </div>
            {user.role === 'OWNER' && (
              <TrashItemButton type="property" id={params.propertyId} />
            )}
          </div>
        </div>

        {/* Floors */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900">Floors</h2>
          {canEditStructure && (
            <div className="mt-3">
              <CreateFloorForm propertyId={params.propertyId} />
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {floors.length === 0 ? (
              <p className="text-sm text-slate-500">No floors yet.</p>
            ) : (
              floors.map((f) => (
                <span
                  key={f._id.toString()}
                  className="inline-flex px-3 py-1 bg-white border border-slate-200 rounded-full text-sm"
                >
                  {f.name}
                </span>
              ))
            )}
          </div>
        </section>

        {/* Units */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-slate-900">Units</h2>
          {canEditStructure && (
            <div className="mt-3">
              <CreateUnitForm
                propertyId={params.propertyId}
                floors={floors.map((f) => ({
                  id: f._id.toString(),
                  name: f.name,
                }))}
              />
            </div>
          )}

          <div className="mt-4 overflow-x-auto">
            {units.length === 0 ? (
              <div className="bg-white border rounded-xl p-8 text-center text-slate-500 text-sm">
                No units yet.
              </div>
            ) : (
              <table className="w-full text-sm bg-white border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Unit</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Beds</th>
                    <th className="px-4 py-3 font-medium">Area</th>
                    {user.role === 'OWNER' && (
                      <th className="px-4 py-3 font-medium"></th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {units.map((u) => (
                    <tr key={u._id.toString()} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {u.unitNumber}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{u.unitType}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            u.vacancyStatus === 'VACANT'
                              ? 'text-amber-600'
                              : 'text-green-600'
                          }
                        >
                          {u.vacancyStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {u.bedrooms ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {u.areaSqft ? `${u.areaSqft} sqft` : '—'}
                      </td>
                      {user.role === 'OWNER' && (
                        <td className="px-4 py-3">
                          {u.vacancyStatus === 'VACANT' && (
                            <TrashItemButton type="unit" id={u._id.toString()} label="Trash" />
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
