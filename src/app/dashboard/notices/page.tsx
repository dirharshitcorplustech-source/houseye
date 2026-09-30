/**
 * HOUSEYE.COM — Notices board (staff)
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/get-session';
import { connectDB } from '@/lib/db/connect';
import { Notice, Property } from '@/models';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { CreateNoticeForm } from '@/components/forms/CreateNoticeForm';

export default async function NoticesPage() {
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
    filter.$or = [
      { propertyId: null },
      { propertyId: { $exists: false } },
      { propertyId: { $in: user.propertyScopes } },
    ];
  }

  const [notices, properties] = await Promise.all([
    Notice.find(filter).sort({ pinned: -1, publishedAt: -1 }).limit(50).lean(),
    Property.find({ accountId: user.accountId, deletedAt: null })
      .select('name')
      .lean(),
  ]);

  const canCreate =
    (user.role === 'OWNER' || user.permissions.includes('notice:create')) &&
    user.subscriptionStatus === 'ACTIVE';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <Link href="/dashboard" className="font-bold text-houseye-primary text-lg">
              Houseye
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">Notices</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notices</h1>
          <p className="text-sm text-slate-500 mt-1">
            Announcements for staff and tenants.
          </p>
        </div>

        {canCreate && (
          <CreateNoticeForm
            properties={properties.map((p) => ({
              id: p._id.toString(),
              name: p.name,
            }))}
          />
        )}

        <div className="space-y-3">
          {notices.length === 0 ? (
            <div className="bg-white border rounded-xl p-10 text-center text-slate-500">
              No notices yet.
            </div>
          ) : (
            notices.map((n) => (
              <div
                key={n._id.toString()}
                className="bg-white border rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-medium text-slate-900">{n.title}</h2>
                  {n.pinned && (
                    <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                      Pinned
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">
                  {n.body}
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  {new Date(n.publishedAt).toLocaleString('en-IN')}
                  {n.expiresAt
                    ? ` · expires ${new Date(n.expiresAt).toLocaleDateString('en-IN')}`
                    : ''}
                </p>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
