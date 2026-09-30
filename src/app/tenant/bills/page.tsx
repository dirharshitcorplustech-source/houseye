/**
 * HOUSEYE.COM — Tenant: view bills + submit payment
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/get-session';
import { connectDB } from '@/lib/db/connect';
import { Bill } from '@/models';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { TenantPayForm } from '@/components/forms/TenantPayForm';

export default async function TenantBillsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'TENANT') redirect('/dashboard');

  await connectDB();

  const bills = await Bill.find({ tenantUserId: user.id })
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
            <span className="text-sm text-slate-600">Bills</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <h1 className="text-xl font-bold text-slate-900">Your bills</h1>

        {bills.length === 0 ? (
          <div className="bg-white border rounded-xl p-8 text-center text-slate-500 text-sm">
            No bills yet.
          </div>
        ) : (
          bills.map((b) => (
            <div
              key={b._id.toString()}
              className="bg-white border rounded-xl p-4 space-y-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-slate-900">{b.billNumber}{" "}<a href={`/api/bills/${b.id || b._id.toString()}/pdf`} className="text-xs text-houseye-primary hover:underline" target="_blank" rel="noreferrer">PDF</a></div>
                  <div className="text-xs text-slate-500">
                    {b.snapshot?.propertyName} · {b.snapshot?.unitNumber}
                  </div>
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100">
                  {b.status}
                </span>
              </div>

              <div className="text-sm space-y-1">
                {b.lines?.map((l, i) => (
                  <div key={i} className="flex justify-between text-slate-600">
                    <span>{l.label}</span>
                    <span>₹{Number(l.amount).toLocaleString('en-IN')}</span>
                  </div>
                ))}
                <div className="flex justify-between font-medium pt-1 border-t">
                  <span>Total</span>
                  <span>₹{Number(b.totalAmount).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Remaining</span>
                  <span className="font-medium">
                    ₹{Number(b.totalRemaining).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  Due {new Date(b.dueDate).toLocaleDateString('en-IN')}
                </div>
              </div>

              {b.status !== 'PAID' &&
                b.status !== 'CANCELLED' &&
                b.paymentLinkActive &&
                b.totalRemaining > 0 && (
                  <TenantPayForm
                    billId={b._id.toString()}
                    maxAmount={b.totalRemaining}
                    totalAmount={b.totalAmount}
                  />
                )}
            </div>
          ))
        )}
      </main>
    </div>
  );
}
