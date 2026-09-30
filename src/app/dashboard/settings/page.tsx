import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/get-session';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { ChangePasswordForm } from '@/components/forms/ChangePasswordForm';

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role === 'TENANT') redirect('/tenant');

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <Link href="/dashboard" className="font-bold text-houseye-primary text-lg">
              Houseye
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">Settings</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">
            {user.fullName} · {user.username} · {user.role}
          </p>
        </div>

        <section>
          <h2 className="font-semibold text-slate-900 mb-3">Change password</h2>
          <ChangePasswordForm />
        </section>

        <section className="text-sm space-y-2">
          <Link
            href="/dashboard/settings/gateway"
            className="block text-houseye-primary hover:underline"
          >
            Tenant payment gateway (your Razorpay keys) →
          </Link>
          <Link
            href="/dashboard/sessions"
            className="block text-houseye-primary hover:underline"
          >
            Manage active sessions →
          </Link>
          <Link
            href="/dashboard/subscription"
            className="block text-houseye-primary hover:underline"
          >
            Subscription →
          </Link>
        </section>
      </main>
    </div>
  );
}
