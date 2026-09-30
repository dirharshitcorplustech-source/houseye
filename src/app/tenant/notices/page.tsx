/**
 * HOUSEYE.COM — Tenant notices
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/get-session';
import { connectDB } from '@/lib/db/connect';
import { Notice, Tenancy } from '@/models';
import { LogoutButton } from '@/components/auth/LogoutButton';

export default async function TenantNoticesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'TENANT') redirect('/dashboard');

  await connectDB();

  const tenancy = await Tenancy.findOne({
    primaryTenantUserId: user.id,
    status: { $in: ['ACTIVE', 'NOTICE'] },
  })
    .select('accountId propertyId')
    .lean();

  let notices: Array<{
    _id: { toString(): string };
    title: string;
    body: string;
    pinned?: boolean;
    publishedAt: Date;
  }> = [];

  if (tenancy) {
    const now = new Date();
    notices = await Notice.find({
      accountId: tenancy.accountId,
      deletedAt: null,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
      $and: [
        {
          $or: [
            { propertyId: null },
            { propertyId: { $exists: false } },
            { propertyId: tenancy.propertyId },
          ],
        },
      ],
    })
      .sort({ pinned: -1, publishedAt: -1 })
      .limit(30)
      .lean();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/tenant" className="font-bold text-houseye-primary">
              Houseye
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-sm text-slate-600">Notices</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <h1 className="text-xl font-bold text-slate-900">Notices</h1>

        {notices.length === 0 ? (
          <div className="bg-white border rounded-xl p-8 text-center text-slate-500 text-sm">
            No notices right now.
          </div>
        ) : (
          notices.map((n) => (
            <div
              key={n._id.toString()}
              className="bg-white border rounded-xl p-4"
            >
              <div className="flex justify-between gap-2">
                <h2 className="font-medium text-slate-900">{n.title}</h2>
                {n.pinned && (
                  <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded h-fit">
                    Pinned
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">
                {n.body}
              </p>
              <p className="text-xs text-slate-400 mt-2">
                {new Date(n.publishedAt).toLocaleString('en-IN')}
              </p>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
