/**
 * HOUSEYE.COM — Expenses list + create
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/get-session';
import { connectDB } from '@/lib/db/connect';
import { Expense, Property } from '@/models';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { CreateExpenseForm } from '@/components/forms/CreateExpenseForm';
import { ExpenseActions } from '@/components/forms/ExpenseActions';

export default async function ExpensesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role === 'TENANT') redirect('/tenant');
  if (user.isSuperAdmin) redirect('/admin');

  await connectDB();

  const filter: Record<string, unknown> = {
    accountId: user.accountId,
    deletedAt: null,
  };
  if (user.role === 'MANAGER' && user.propertyScopes?.length) {
    filter.propertyId = { $in: user.propertyScopes };
  }

  const [expenses, properties] = await Promise.all([
    Expense.find(filter).sort({ expenseDate: -1 }).limit(50).lean(),
    Property.find({
      accountId: user.accountId,
      deletedAt: null,
      ...(user.role === 'MANAGER' && user.propertyScopes?.length
        ? { _id: { $in: user.propertyScopes } }
        : {}),
    })
      .select('name')
      .lean(),
  ]);

  const propMap = Object.fromEntries(
    properties.map((p) => [p._id.toString(), p.name])
  );

  const canEdit =
    (user.role === 'OWNER' || user.permissions.includes('expense:edit')) &&
    user.subscriptionStatus === 'ACTIVE';

  const canCreate =
    (user.role === 'OWNER' || user.permissions.includes('expense:create')) &&
    user.subscriptionStatus === 'ACTIVE';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <Link href="/dashboard" className="font-bold text-houseye-primary text-lg">
              Houseye
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">Expenses</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900">Expenses</h1>

        {canCreate && properties.length > 0 && (
          <div className="mt-6">
            <CreateExpenseForm
              properties={properties.map((p) => ({
                id: p._id.toString(),
                name: p.name,
              }))}
            />
          </div>
        )}

        <div className="mt-8 overflow-x-auto">
          {expenses.length === 0 ? (
            <div className="bg-white border rounded-xl p-10 text-center text-slate-500">
              No expenses yet.
            </div>
          ) : (
            <table className="w-full text-sm bg-white border rounded-xl overflow-hidden">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Property</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e._id.toString()} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(e.expenseDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      {propMap[e.propertyId.toString()] || '—'}
                    </td>
                    <td className="px-4 py-3">{e.category}</td>
                    <td className="px-4 py-3 font-medium">
                      ₹{Number(e.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {e.description || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {canEdit && (
                        <ExpenseActions
                          expenseId={e._id.toString()}
                          amount={Number(e.amount)}
                          category={e.category}
                        />
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
