/**
 * HOUSEYE.COM — Audit log viewer (Owner)
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/get-session';
import { connectDB } from '@/lib/db/connect';
import { AuditLog } from '@/models';
import { LogoutButton } from '@/components/auth/LogoutButton';

export default async function AuditPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'OWNER') redirect('/dashboard');

  await connectDB();

  const logs = await AuditLog.find({ accountId: user.accountId })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <Link href="/dashboard" className="font-bold text-houseye-primary text-lg">
              Houseye
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">Audit log</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900">Audit log</h1>
        <p className="text-sm text-slate-500 mt-1">
          High-impact actions only — not every UI click.
        </p>

        <div className="mt-6 space-y-2">
          {logs.length === 0 ? (
            <div className="bg-white border rounded-xl p-10 text-center text-slate-500">
              No audit entries yet.
            </div>
          ) : (
            logs.map((l) => (
              <div
                key={l._id.toString()}
                className="bg-white border rounded-xl px-4 py-3 text-sm"
              >
                <div className="flex justify-between gap-2">
                  <span className="font-medium text-slate-900">{l.action}</span>
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {new Date(l.createdAt).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {l.entityType && (
                    <span>
                      {l.entityType}
                      {l.entityId ? ` · ${l.entityId.slice(-8)}` : ''}
                    </span>
                  )}
                  {l.actorRole && (
                    <span className="ml-2">by {l.actorRole}</span>
                  )}
                </div>
                {l.metadata && (
                  <pre className="mt-1 text-xs text-slate-400 overflow-x-auto">
                    {JSON.stringify(l.metadata)}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
