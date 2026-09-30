/**
 * HOUSEYE.COM — Trash UI (Owner)
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/get-session';
import { connectDB } from '@/lib/db/connect';
import { Property, Unit } from '@/models';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { TrashRestoreButton } from '@/components/forms/TrashRestoreButton';

export default async function TrashPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'OWNER') redirect('/dashboard');

  await connectDB();

  const filter = {
    accountId: user.accountId,
    deletedAt: { $ne: null },
  };

  const [properties, units] = await Promise.all([
    Property.find(filter).sort({ deletedAt: -1 }).limit(50).lean(),
    Unit.find(filter).sort({ deletedAt: -1 }).limit(50).lean(),
  ]);

  const items = [
    ...properties.map((p) => ({
      type: 'property' as const,
      id: p._id.toString(),
      name: p.name,
      deletedAt: p.deletedAt,
    })),
    ...units.map((u) => ({
      type: 'unit' as const,
      id: u._id.toString(),
      name: `Unit ${u.unitNumber}`,
      deletedAt: u.deletedAt,
    })),
  ].sort(
    (a, b) =>
      new Date(b.deletedAt || 0).getTime() - new Date(a.deletedAt || 0).getTime()
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <Link href="/dashboard" className="font-bold text-houseye-primary text-lg">
              Houseye
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">Trash</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900">Trash</h1>
        <p className="text-sm text-slate-500 mt-1">
          Soft-deleted records. No permanent delete. Restore blocks conflicts.
        </p>

        <div className="mt-6 space-y-2">
          {items.length === 0 ? (
            <div className="bg-white border rounded-xl p-10 text-center text-slate-500">
              Trash is empty.
            </div>
          ) : (
            items.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                className="bg-white border rounded-xl px-4 py-3 flex justify-between items-center text-sm"
              >
                <div>
                  <span className="text-xs text-slate-400 uppercase mr-2">
                    {item.type}
                  </span>
                  <span className="font-medium">{item.name}</span>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Deleted{' '}
                    {item.deletedAt
                      ? new Date(item.deletedAt).toLocaleString('en-IN')
                      : '—'}
                  </div>
                </div>
                <TrashRestoreButton type={item.type} id={item.id} />
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
