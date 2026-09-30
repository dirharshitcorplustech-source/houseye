/**
 * HOUSEYE.COM — Super Admin dashboard with customer list
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/get-session';
import { listCustomers } from '@/services/admin/customers';
import { connectDB } from '@/lib/db/connect';
import { Account } from '@/models';
import { LogoutButton } from '@/components/auth/LogoutButton';

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!user.isSuperAdmin) redirect('/dashboard');

  await connectDB();

  const [customersResult, activeCount, expiredCount, suspendedCount] =
    await Promise.all([
      listCustomers({ limit: 20 }),
      Account.countDocuments({
        subscriptionStatus: 'ACTIVE',
        deactivatedAt: null,
      }),
      Account.countDocuments({
        subscriptionStatus: { $in: ['EXPIRED', 'CANCELLED'] },
      }),
      Account.countDocuments({ isSuspended: true }),
    ]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="font-bold text-lg">
            Houseye{' '}
            <span className="text-slate-400 font-normal">Super Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-300">{user.username}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900">Platform overview</h1>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-sm text-slate-500">Customers</div>
            <div className="text-2xl font-semibold text-slate-900 mt-1">
              {customersResult.total}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-sm text-slate-500">Active subs</div>
            <div className="text-2xl font-semibold text-slate-900 mt-1">
              {activeCount}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-sm text-slate-500">Expired</div>
            <div className="text-2xl font-semibold text-slate-900 mt-1">
              {expiredCount}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-sm text-slate-500">Suspended</div>
            <div className="text-2xl font-semibold text-slate-900 mt-1">
              {suspendedCount}
            </div>
          </div>
        </div>

        <h2 className="mt-10 text-lg font-semibold text-slate-900">
          Recent customers
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm bg-white border rounded-xl overflow-hidden">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Account</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {customersResult.customers.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/customers/${c.id}`}
                      className="font-medium text-houseye-primary hover:underline"
                    >
                      {c.organizationName || c.name}
                    </Link>
                    <div className="text-xs text-slate-400">{c.accountType}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.owner?.fullName || '—'}
                    <div className="text-xs text-slate-400">
                      {c.owner?.username}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.planName || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium">
                      {c.isSuspended
                        ? 'SUSPENDED'
                        : c.deactivatedAt
                          ? 'DELETED'
                          : c.subscriptionStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(c.createdAt).toLocaleDateString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
