/**
 * HOUSEYE.COM — Properties list (dashboard)
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/get-session';
import { listProperties } from '@/services/properties/list-properties';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { CreatePropertyForm } from '@/components/forms/CreatePropertyForm';

export default async function PropertiesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role === 'TENANT') redirect('/tenant');
  if (user.isSuperAdmin) redirect('/admin');

  const { properties } = await listProperties(user);
  const canCreate = user.role === 'OWNER';
  const isActive = user.subscriptionStatus === 'ACTIVE';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="font-bold text-houseye-primary text-lg">
              Houseye
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-sm text-slate-600">Properties</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Properties</h1>
            <p className="text-sm text-slate-500 mt-1">
              {properties.length} propert{properties.length === 1 ? 'y' : 'ies'}
            </p>
          </div>
        </div>

        {!isActive && canCreate && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-900">
            Subscription is <strong>{user.subscriptionStatus || 'inactive'}</strong>.
            Creating properties requires an active plan.
            {user.subscriptionStatus === 'EXPLORE' && (
              <span className="block mt-1 text-amber-800">
                Go to{' '}
                <a href="/dashboard/subscription" className="underline font-medium">
                  Subscription
                </a>{' '}
                and activate a plan (dev mode does not need a payment gateway).
              </span>
            )}
          </div>
        )}

        {canCreate && isActive && (
          <div className="mt-6">
            <CreatePropertyForm />
          </div>
        )}

        <div className="mt-8">
          {properties.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-500">
              No properties yet.
              {canCreate && isActive && (
                <p className="mt-2 text-sm">Use the form above to add your first property.</p>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {properties.map((p) => (
                <Link
                  key={p.id as string}
                  href={`/dashboard/properties/${p.id}`}
                  className="bg-white border border-slate-200 rounded-xl p-5 hover:border-houseye-primary transition-colors"
                >
                  <div className="font-medium text-slate-900">{p.name as string}</div>
                  <div className="text-sm text-slate-500 mt-1">
                    {(p.propertyType as string)?.replace('_', ' ')}
                  </div>
                  {(p.address as { city?: string } | null | undefined) && (
                    <div className="text-xs text-slate-400 mt-2">
                      {(p.address as { city?: string }).city || '—'}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
