/**
 * HOUSEYE.COM — Staff in-app notifications
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/get-session';
import { connectDB } from '@/lib/db/connect';
import { Notification } from '@/models';
import { LogoutButton } from '@/components/auth/LogoutButton';

export default async function StaffNotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role === 'TENANT') redirect('/tenant/notifications');
  if (user.isSuperAdmin) redirect('/admin');

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
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <Link href="/dashboard" className="font-bold text-houseye-primary text-lg">
              Houseye
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">Notifications</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
        <p className="text-sm text-slate-500 mt-1">
          In-app alerts for your account.
        </p>

        <div className="mt-6 space-y-2">
          {notifications.length === 0 ? (
            <div className="bg-white border rounded-xl p-10 text-center text-slate-500">
              No notifications yet.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n._id.toString()}
                className="bg-white border rounded-xl px-4 py-3 text-sm"
              >
                {n.subject && (
                  <div className="font-medium text-slate-900">{n.subject}</div>
                )}
                <p className="text-slate-600 mt-0.5">{n.message}</p>
                <div className="text-xs text-slate-400 mt-2 flex justify-between">
                  <span>{n.notificationType}</span>
                  <span>
                    {new Date(n.createdAt).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
