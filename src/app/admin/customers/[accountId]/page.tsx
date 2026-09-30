import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/get-session';
import { getCustomerDetail } from '@/services/admin/customers';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { AdminCustomerActions } from '@/components/admin/AdminCustomerActions';

export default async function AdminCustomerPage({
  params,
}: {
  params: { accountId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!user.isSuperAdmin) redirect('/dashboard');

  const detail = await getCustomerDetail(params.accountId);
  if (!detail) notFound();

  const { account, owner, counts, admins, managers } = detail;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <Link href="/admin" className="font-bold text-lg">
              Houseye Admin
            </Link>
            <span className="text-slate-500">/</span>
            <span>{account.organizationName || account.name}</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-900 mb-6">
          Super Admin mode — sensitive actions are privileged.
        </div>

        <h1 className="text-2xl font-bold text-slate-900">
          {account.organizationName || account.name}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {account.accountType} · {account.subscriptionStatus}
          {account.planId ? ` · ${account.planId}` : ''}
        </p>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <Stat label="Properties" value={counts.properties} />
          <Stat label="Units" value={counts.units} />
          <Stat label="Tenants" value={counts.activeTenants} />
          <Stat label="Staff" value={counts.admins + counts.managers} />
        </div>

        <div className="mt-6 bg-white border rounded-xl divide-y text-sm">
          <Row label="Owner" value={owner?.fullName || '—'} />
          <Row label="Username" value={owner?.username || '—'} />
          <Row label="Email" value={owner?.email || account.billingEmail || '—'} />
          <Row label="GSTIN" value={account.gstin || '—'} />
          <Row label="PAN" value={account.pan || '—'} />
          <Row
            label="Suspended"
            value={account.isSuspended ? account.suspensionReason || 'Yes' : 'No'}
          />
          <Row
            label="Deletion pending"
            value={
              account.deletionRequestedAt
                ? new Date(account.deletionRequestedAt).toLocaleDateString('en-IN')
                : 'No'
            }
          />
          <Row
            label="Deactivated"
            value={
              account.deactivatedAt
                ? new Date(account.deactivatedAt).toLocaleDateString('en-IN')
                : 'No'
            }
          />
        </div>

        <div className="mt-6">
          <AdminCustomerActions
            accountId={account.id}
            isSuspended={!!account.isSuspended}
            isDeactivated={!!account.deactivatedAt}
          />
        </div>

        {(admins.length > 0 || managers.length > 0) && (
          <div className="mt-8">
            <h2 className="font-semibold text-slate-900">Team</h2>
            <ul className="mt-2 text-sm text-slate-600 space-y-1">
              {admins.map((a) => (
                <li key={a.id}>
                  Admin: {a.fullName} ({a.status})
                </li>
              ))}
              {managers.map((m) => (
                <li key={m.id}>
                  Manager: {m.fullName} ({m.status})
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border rounded-lg px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between px-4 py-3">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}
