/**
 * HOUSEYE.COM — Staff maintenance queue
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/get-session';
import { connectDB } from '@/lib/db/connect';
import MaintenanceRequest from '@/models/MaintenanceRequest';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { MaintenanceStatusActions } from '@/components/forms/MaintenanceStatusActions';

export default async function StaffMaintenancePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role === 'TENANT') redirect('/tenant/maintenance');
  if (user.isSuperAdmin) redirect('/admin');

  await connectDB();

  const filter: Record<string, unknown> = { accountId: user.accountId };
  if (user.role === 'MANAGER' && user.propertyScopes?.length) {
    filter.propertyId = { $in: user.propertyScopes };
  }

  const requests = await MaintenanceRequest.find(filter)
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const canUpdate =
    user.role === 'OWNER' || user.permissions.includes('maintenance:update');

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <Link href="/dashboard" className="font-bold text-houseye-primary text-lg">
              Houseye
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">Maintenance</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900">Maintenance</h1>
        <p className="text-sm text-slate-500 mt-1">
          Requests cannot be deleted — advance status until Closed.
        </p>

        <div className="mt-6 space-y-3">
          {requests.length === 0 ? (
            <div className="bg-white border rounded-xl p-10 text-center text-slate-500">
              No maintenance requests.
            </div>
          ) : (
            requests.map((r) => (
              <div
                key={r._id.toString()}
                className="bg-white border rounded-xl p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"
              >
                <div className="text-sm min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-900">
                      {r.category}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100">
                      {r.status}
                    </span>
                    <span className="text-xs text-amber-700">{r.priority}</span>
                  </div>
                  <p className="text-slate-600 mt-1">{r.description}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(r.createdAt).toLocaleString('en-IN')}
                  </p>
                </div>
                {canUpdate && r.status !== 'CLOSED' && (
                  <MaintenanceStatusActions
                    requestId={r._id.toString()}
                    currentStatus={r.status}
                  />
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
