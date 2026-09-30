/**
 * HOUSEYE.COM — Custom permission matrix for Admin/Manager
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/get-session';
import { connectDB } from '@/lib/db/connect';
import { User } from '@/models';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { PermissionMatrixForm } from '@/components/forms/PermissionMatrixForm';
import {
  PERMISSIONS,
  DEFAULT_ADMIN_PERMISSIONS,
  DEFAULT_MANAGER_PERMISSIONS,
} from '@/constants/permissions';

export default async function PermissionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'OWNER') redirect('/dashboard/team');

  await connectDB();

  const staff = await User.find({
    accountId: user.accountId,
    role: { $in: ['ADMIN', 'MANAGER'] },
    status: { $in: ['ACTIVE', 'SUSPENDED'] },
  })
    .select('fullName username role permissions propertyScopes status')
    .lean();

  const allPermissions = Object.entries(PERMISSIONS).map(([k, v]) => ({
    key: v,
    label: k.replace(/_/g, ' '),
  }));

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <Link href="/dashboard" className="font-bold text-houseye-primary text-lg">
              Houseye
            </Link>
            <span className="text-slate-300">/</span>
            <Link href="/dashboard/team" className="text-slate-600">
              Team
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">Permissions</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Permissions</h1>
          <p className="text-sm text-slate-500 mt-1">
            Customize Admin / Manager access. Owner always has full control.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Defaults — Admin: {DEFAULT_ADMIN_PERMISSIONS.length} keys · Manager:{' '}
            {DEFAULT_MANAGER_PERMISSIONS.length} keys
          </p>
        </div>

        {staff.length === 0 ? (
          <div className="bg-white border rounded-xl p-8 text-center text-slate-500">
            Invite Admin or Manager first.
          </div>
        ) : (
          staff.map((s) => (
            <PermissionMatrixForm
              key={s._id.toString()}
              userId={s._id.toString()}
              name={s.fullName}
              username={s.username}
              role={s.role}
              current={s.permissions || []}
              allPermissions={allPermissions}
            />
          ))
        )}
      </main>
    </div>
  );
}
