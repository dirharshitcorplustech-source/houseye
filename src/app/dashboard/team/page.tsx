/**
 * HOUSEYE.COM — Team management (Admins + Managers)
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/get-session';
import { connectDB } from '@/lib/db/connect';
import { User, Property } from '@/models';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { InviteManagerForm } from '@/components/forms/InviteManagerForm';
import { InviteAdminForm } from '@/components/forms/InviteAdminForm';
import { StaffActions } from '@/components/forms/StaffActions';

export default async function TeamPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role === 'TENANT') redirect('/tenant');
  if (user.isSuperAdmin) redirect('/admin');

  await connectDB();

  const [admins, managers, properties] = await Promise.all([
    User.find({
      accountId: user.accountId,
      role: 'ADMIN',
      status: { $nin: ['REMOVED'] },
    })
      .select('fullName username email status')
      .lean(),
    User.find({
      accountId: user.accountId,
      role: 'MANAGER',
      status: { $nin: ['REMOVED'] },
    })
      .select('fullName username email status propertyScopes')
      .lean(),
    Property.find({ accountId: user.accountId, deletedAt: null })
      .select('name')
      .lean(),
  ]);

  const isOwner = user.role === 'OWNER';
  const canInviteManager =
    isOwner || user.permissions.includes('team:invite_manager');
  const propOptions = properties.map((p) => ({
    id: p._id.toString(),
    name: p.name,
  }));

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <Link href="/dashboard" className="font-bold text-houseye-primary text-lg">
              Houseye
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">Team</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-10">
        <div>
          <div className="flex justify-between items-start gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Team</h1>
            {isOwner && (
              <a href="/dashboard/team/permissions" className="text-sm text-houseye-primary">
                Permissions →
              </a>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Admins and Managers. Structure changes remain Owner-only.
          </p>
        </div>

        {/* Admins */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900">
            Admins ({admins.length})
          </h2>
          {isOwner && user.subscriptionStatus === 'ACTIVE' && (
            <div className="mt-3">
              <InviteAdminForm />
            </div>
          )}
          <div className="mt-4 space-y-2">
            {admins.length === 0 ? (
              <p className="text-sm text-slate-500">No admins yet.</p>
            ) : (
              admins.map((a) => (
                <div
                  key={a._id.toString()}
                  className="bg-white border rounded-xl px-4 py-3 flex justify-between items-center text-sm gap-2"
                >
                  <div>
                    <span className="font-medium">{a.fullName}</span>
                    <span className="text-slate-400 ml-2">{a.username}</span>
                    <span className="text-xs text-slate-500 ml-2">{a.status}</span>
                  </div>
                  {isOwner && <StaffActions userId={a._id.toString()} status={a.status} />}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Managers */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900">
            Managers ({managers.length})
          </h2>
          {canInviteManager &&
            user.subscriptionStatus === 'ACTIVE' &&
            propOptions.length > 0 && (
              <div className="mt-3">
                <InviteManagerForm properties={propOptions} />
              </div>
            )}
          <div className="mt-4 space-y-2">
            {managers.length === 0 ? (
              <p className="text-sm text-slate-500">No managers yet.</p>
            ) : (
              managers.map((m) => (
                <div
                  key={m._id.toString()}
                  className="bg-white border rounded-xl px-4 py-3 flex justify-between items-center text-sm gap-2"
                >
                  <div>
                    <span className="font-medium">{m.fullName}</span>
                    <span className="text-slate-400 ml-2">{m.username}</span>
                    <span className="text-xs text-slate-500 ml-2">{m.status}</span>
                  </div>
                  {(isOwner || canInviteManager) && (
                    <StaffActions userId={m._id.toString()} status={m.status} />
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
