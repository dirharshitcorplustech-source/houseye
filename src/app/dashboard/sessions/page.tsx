import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/get-session';
import { listSessions } from '@/services/auth/sessions';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { SessionActions } from '@/components/auth/SessionActions';

export default async function SessionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role === 'TENANT') redirect('/tenant');

  const sessions = await listSessions(user);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <Link href="/dashboard" className="font-bold text-houseye-primary text-lg">
              Houseye
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">Sessions</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900">Active sessions</h1>
        <p className="text-sm text-slate-500 mt-1">
          You can use multiple devices. Logout only ends the current device.
        </p>

        <div className="mt-6 space-y-3">
          {sessions.map((s) => (
            <div
              key={s.sessionId}
              className="bg-white border rounded-xl p-4 flex justify-between items-start gap-4"
            >
              <div className="text-sm min-w-0">
                <div className="font-medium text-slate-900">
                  {s.isCurrent ? 'This device' : 'Other device'}
                  {s.isCurrent && (
                    <span className="ml-2 text-xs text-green-600 font-normal">
                      current
                    </span>
                  )}
                </div>
                <div className="text-slate-500 text-xs mt-1 truncate">
                  {s.userAgent || 'Unknown browser'}
                </div>
                <div className="text-slate-400 text-xs mt-1">
                  {s.ipAddress || '—'} · Last active{' '}
                  {new Date(s.lastActiveAt).toLocaleString('en-IN')}
                </div>
              </div>
              {!s.isCurrent && (
                <SessionActions sessionId={s.sessionId} />
              )}
            </div>
          ))}
        </div>

        {sessions.length > 1 && (
          <div className="mt-6">
            <SessionActions terminateOthers />
          </div>
        )}
      </main>
    </div>
  );
}
