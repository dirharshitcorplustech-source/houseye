/**
 * HOUSEYE.COM — Payments review (Owner / staff)
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/get-session';
import { connectDB } from '@/lib/db/connect';
import { Payment } from '@/models';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { PaymentActions } from '@/components/forms/PaymentActions';

export default async function PaymentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role === 'TENANT') redirect('/tenant');
  if (user.isSuperAdmin) redirect('/admin');

  await connectDB();

  const payments = await Payment.find({ accountId: user.accountId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const canReview =
    user.role === 'OWNER' ||
    user.permissions.includes('payment:approve') ||
    user.permissions.includes('payment:reject');

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <Link href="/dashboard" className="font-bold text-houseye-primary text-lg">
              Houseye
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">Payments</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review submitted payment proofs. Approval runs locked allocation.
        </p>

        <div className="mt-6 overflow-x-auto">
          {payments.length === 0 ? (
            <div className="bg-white border rounded-xl p-10 text-center text-slate-500">
              No payments yet.
            </div>
          ) : (
            <table className="w-full text-sm bg-white border rounded-xl overflow-hidden">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Receipt</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p._id.toString()} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium">
                      ₹{Number(p.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.method}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                      {p.status === 'REJECTED' && p.rejectionReason && (
                        <div className="text-xs text-red-600 mt-0.5">
                          {p.rejectionReason}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(p.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {p.receiptNumber || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {canReview && p.status === 'SUBMITTED' && (
                        <PaymentActions paymentId={p._id.toString()} />
                      )}
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

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    SUBMITTED: 'text-amber-700 bg-amber-50',
    APPROVED: 'text-green-700 bg-green-50',
    REJECTED: 'text-red-700 bg-red-50',
    PENDING: 'text-slate-600 bg-slate-100',
    FAILED: 'text-red-700 bg-red-50',
  };
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${colors[status] || 'bg-slate-100'}`}
    >
      {status}
    </span>
  );
}
