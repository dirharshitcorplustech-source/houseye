/**
 * HOUSEYE.COM — Dashboard (Owner / Admin / Manager)
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/get-session';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { getDashboardStats } from '@/services/dashboard/stats';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role === 'TENANT') {
    redirect('/tenant');
  }

  if (user.isSuperAdmin) {
    redirect('/admin');
  }

  const stats = await getDashboardStats(user);

  const isExplore = user.subscriptionStatus === 'EXPLORE';
  const isExpired =
    user.subscriptionStatus === 'EXPIRED' ||
    user.subscriptionStatus === 'CANCELLED';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="font-bold text-houseye-primary text-lg">Houseye</div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-600 hidden sm:block">
              <span className="font-medium text-slate-900">{user.fullName}</span>
              <span className="mx-1">·</span>
              <span className="text-slate-500">{user.username}</span>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      {isExplore && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-6xl mx-auto px-4 py-3 text-sm text-amber-900">
            You are in <strong>Explore Mode</strong>. Browse the platform and
            create drafts. Activate a subscription to unlock full operational
            features.
            <Link
              href="/dashboard/subscription"
              className="ml-2 font-medium underline"
            >
              View plans
            </Link>
          </div>
        </div>
      )}

      {isExpired && (
        <div className="bg-red-50 border-b border-red-200">
          <div className="max-w-6xl mx-auto px-4 py-3 text-sm text-red-900">
            Your subscription is inactive. Most operational actions are blocked
            until you renew.
            <Link
              href="/dashboard/subscription"
              className="ml-2 font-medium underline"
            >
              Renew now
            </Link>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-10">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-slate-600 text-sm">
            Role: <span className="font-medium">{user.role}</span>
            {user.subscriptionStatus && (
              <>
                {' '}
                · Subscription:{' '}
                <span className="font-medium">{user.subscriptionStatus}</span>
              </>
            )}
          </p>
        </div>

        {stats && (
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ['Properties', stats.properties],
              ['Units', stats.units],
              ['Vacant', stats.vacantUnits],
              ['Tenants', stats.activeTenants],
              ['Open bills', stats.openBills],
              ['Pending payments', stats.pendingPayments],
              ['Open maintenance', stats.openMaintenance],
              ['Occupied', stats.occupiedUnits],
            ].map(([label, value]) => (
              <div
                key={label as string}
                className="bg-white border border-slate-200 rounded-xl px-4 py-3"
              >
                <div className="text-xs text-slate-500">{label}</div>
                <div className="text-xl font-semibold text-slate-900 mt-0.5">
                  {value as number}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: 'Properties', desc: 'Add buildings, floors & units', phase: 'Available', href: '/dashboard/properties' },
            { title: 'Tenants', desc: 'Manage tenancies & move-in/out', phase: 'Available', href: '/dashboard/tenants' },
            { title: 'Bills', desc: 'Generate & track bills', phase: 'Available', href: '/dashboard/bills' },
            { title: 'Payments', desc: 'Approve payment proofs', phase: 'Available', href: '/dashboard/payments' },
            { title: 'Maintenance', desc: 'Complaints & cost recovery', phase: 'Available', href: '/dashboard/maintenance' },
            { title: 'Expenses', desc: 'Property expenses', phase: 'Available', href: '/dashboard/expenses' },
            { title: 'Meter', desc: 'Unit meter readings', phase: 'Available', href: '/dashboard/meter' },
            { title: 'Documents', desc: 'Agreements & files', phase: 'Available', href: '/dashboard/documents' },
            { title: 'Team', desc: 'Admins, Managers & permissions', phase: 'Available', href: '/dashboard/team' },
            { title: 'Permissions', desc: 'Custom staff access matrix', phase: 'Owner', href: '/dashboard/team/permissions' },
            { title: 'Notices', desc: 'Announcements board', phase: 'Available', href: '/dashboard/notices' },
            { title: 'Notifications', desc: 'In-app alerts', phase: 'Available', href: '/dashboard/notifications' },
            { title: 'Subscription', desc: 'Plans, add-ons & invoices', phase: 'Available', href: '/dashboard/subscription' },
            { title: 'Trash', desc: 'Restore soft-deleted records', phase: 'Owner', href: '/dashboard/trash' },
            { title: 'Audit log', desc: 'High-impact actions', phase: 'Owner', href: '/dashboard/audit' },
            { title: 'Settings', desc: 'Password & profile', phase: 'Available', href: '/dashboard/settings' },
            { title: 'Sessions', desc: 'Active devices', phase: 'Available', href: '/dashboard/sessions' },
          ].map((item) => {
            const className =
              'bg-white border border-slate-200 rounded-xl p-5 block hover:border-houseye-primary transition-colors';
            const body = (
              <>
                <div className="font-medium text-slate-900">{item.title}</div>
                <div className="text-sm text-slate-500 mt-1">{item.desc}</div>
                <div className="text-xs text-slate-400 mt-3">{item.phase}</div>
              </>
            );
            if ('href' in item && item.href) {
              return (
                <Link key={item.title} href={item.href} className={className}>
                  {body}
                </Link>
              );
            }
            return (
              <div key={item.title} className={className}>
                {body}
              </div>
            );
          })}
        </div>

        <div className="mt-10 p-4 bg-white border border-slate-200 rounded-xl text-sm text-slate-600">
          <p className="font-medium text-slate-800">Build progress</p>
          <ul className="mt-2 list-disc list-inside space-y-1">
            <li>Phase 1 — Auth, sessions, registration, isolation</li>
            <li>Phase 2–6 — Property, Tenant, Billing, Payments, Subscription</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
