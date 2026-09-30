/**
 * HOUSEYE.COM — Tenant maintenance requests
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/get-session';
import { connectDB } from '@/lib/db/connect';
import MaintenanceRequest, { MAINTENANCE_CATEGORIES } from '@/models/MaintenanceRequest';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { SubmitMaintenanceForm } from '@/components/forms/SubmitMaintenanceForm';

export default async function TenantMaintenancePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'TENANT') redirect('/dashboard');

  await connectDB();

  const requests = await MaintenanceRequest.find({ tenantUserId: user.id })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/tenant" className="font-bold text-houseye-primary">
              Houseye
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-sm text-slate-600">Maintenance</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <h1 className="text-xl font-bold text-slate-900">Maintenance</h1>

        <SubmitMaintenanceForm categories={[...MAINTENANCE_CATEGORIES]} />

        <div className="space-y-3">
          <h2 className="text-sm font-medium text-slate-700">Your requests</h2>
          {requests.length === 0 ? (
            <p className="text-sm text-slate-500">No requests yet.</p>
          ) : (
            requests.map((r) => (
              <div
                key={r._id.toString()}
                className="bg-white border rounded-xl p-4 text-sm"
              >
                <div className="flex justify-between">
                  <span className="font-medium text-slate-900">{r.category}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-100">
                    {r.status}
                  </span>
                </div>
                <p className="text-slate-600 mt-1">{r.description}</p>
                <div className="text-xs text-slate-400 mt-2">
                  Priority: {r.priority} ·{' '}
                  {new Date(r.createdAt).toLocaleDateString('en-IN')}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
