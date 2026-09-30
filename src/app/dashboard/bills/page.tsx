/**
 * HOUSEYE.COM — Bills list + generate for a tenancy
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/get-session';
import { connectDB } from '@/lib/db/connect';
import { Bill, Tenancy } from '@/models';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { GenerateBillForm } from '@/components/forms/GenerateBillForm';

export default async function BillsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role === 'TENANT') redirect('/tenant');
  if (user.isSuperAdmin) redirect('/admin');

  await connectDB();

  const [bills, tenancies] = await Promise.all([
    Bill.find({ accountId: user.accountId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
    Tenancy.find({ accountId: user.accountId, status: 'ACTIVE' })
      .select('fullName unitId rent')
      .lean(),
  ]);

  const canGenerate =
    user.role === 'OWNER' || user.permissions.includes('bill:generate');

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <Link href="/dashboard" className="font-bold text-houseye-primary text-lg">
              Houseye
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">Bills</span>
          </div>
          <div className="flex gap-3">
            <Link
              href="/dashboard/payments"
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              Payments
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900">Bills</h1>

        {canGenerate && user.subscriptionStatus === 'ACTIVE' && (
          <div className="mt-6">
            <GenerateBillForm
              tenancies={tenancies.map((t) => ({
                id: t._id.toString(),
                fullName: t.fullName,
                rent: t.rent,
              }))}
            />
          </div>
        )}

        <div className="mt-8 overflow-x-auto">
          {bills.length === 0 ? (
            <div className="bg-white border rounded-xl p-10 text-center text-slate-500">
              No bills yet.
            </div>
          ) : (
            <table className="w-full text-sm bg-white border rounded-xl overflow-hidden">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Bill #</th>
                  <th className="px-4 py-3 font-medium">Tenant</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Remaining</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Due</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((b) => (
                  <tr key={b._id.toString()} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {b.billNumber}{" "}<a href={`/api/bills/${b.id || b._id.toString()}/pdf`} className="text-xs text-houseye-primary hover:underline" target="_blank" rel="noreferrer">PDF</a>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {b.snapshot?.tenantName || '—'}
                      <div className="text-xs text-slate-400">
                        {b.snapshot?.unitNumber}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      ₹{Number(b.totalAmount).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      ₹{Number(b.totalRemaining).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium">{b.status}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {new Date(b.dueDate).toLocaleDateString('en-IN')}
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
