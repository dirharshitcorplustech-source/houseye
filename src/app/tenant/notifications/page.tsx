/**
 * HOUSEYE.COM — Tenant in-app notifications
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/get-session';
import { connectDB } from '@/lib/db/connect';
import { Notification } from '@/models';
import { LogoutButton } from '@/components/auth/LogoutButton';

export default async function TenantNotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'TENANT') redirect('/dashboard');

  await connectDB();

  const notifications = await Notification.find({
    recipientUserId: user.id,
    channel: 'IN_APP',
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/tenant" className="font-bold text-houseye-primary">
              Houseye
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-sm text-slate-600">Notifications</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-3">
        <h1 className="text-xl font-bold text-slate-900">Notifications</h1>

        {notifications.length === 0 ? (
          <div className="bg-white border rounded-xl p-8 text-center text-slate-500 text-sm">
            No notifications yet.
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n._id.toString()}
              className="bg-white border rounded-xl p-4 text-sm"
            >
              {n.subject && (
                <div className="font-medium text-slate-900">{n.subject}</div>
              )}
              <p className="text-slate-600 mt-1">{n.message}</p>
              <div className="text-xs text-slate-400 mt-2 flex justify-between">
                <span>{n.notificationType}</span>
                <span>{new Date(n.createdAt).toLocaleString('en-IN')}</span>
              </div>
              {n.link && (
                <Link
                  href={n.link.replace(/^https?:\/\/[^/]+/, '') || '/tenant'}
                  className="text-xs text-houseye-primary mt-2 inline-block"
                >
                  Open →
                </Link>
              )}
            </div>
          ))
        )}
      </main>
    </div>
  );
}
