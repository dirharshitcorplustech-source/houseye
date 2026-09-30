/**
 * HOUSEYE.COM — Owner payment gateway settings
 * Keys collect rent from THIS owner's tenants only → Owner's merchant.
 * Houseye platform keys are NEVER used here.
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/get-session';
import { getOwnerGatewayPublic } from '@/services/payments/owner-gateway';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { OwnerGatewayForm } from '@/components/forms/OwnerGatewayForm';

export default async function GatewaySettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'OWNER') redirect('/dashboard/settings');
  if (!user.accountId) redirect('/dashboard');

  const gateway = await getOwnerGatewayPublic(user.accountId);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <Link href="/dashboard" className="font-bold text-houseye-primary text-lg">
              Houseye
            </Link>
            <span className="text-slate-300">/</span>
            <Link href="/dashboard/settings" className="text-slate-600">
              Settings
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">Payments</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Tenant payment collection
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Two methods for collecting rent from <strong>your tenants only</strong>:
          </p>
          <ul className="mt-2 text-sm text-slate-600 list-disc pl-5 space-y-1">
            <li>
              <strong>Manual</strong> — Tenant submits UPI/cash proof; you approve
              (always available).
            </li>
            <li>
              <strong>Online gateway</strong> — You add <em>your</em> Razorpay keys.
              Money settles to <em>your</em> merchant account, not Houseye.
            </li>
          </ul>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-900">
          <p className="font-medium">Money flow (locked)</p>
          <p className="mt-1">
            Houseye subscription fee → Houseye platform gateway
            <br />
            Tenant rent / dues → <strong>Your</strong> gateway keys only
            <br />
            Email / SMS notifications → Houseye platform (central)
          </p>
        </div>

        <div className="bg-white border rounded-xl p-4 text-xs text-slate-600">
          <div className="font-medium text-slate-800 mb-1">Razorpay webhook URL</div>
          <code className="break-all">
            {process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'}
            /api/webhooks/owner-razorpay/{user.accountId}
          </code>
          <p className="mt-1">Paste this in your Razorpay dashboard (payment.captured).</p>
          <div className="font-medium text-slate-800 mb-1 mt-3">Stripe webhook URL</div>
          <code className="break-all">
            {process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'}
            /api/webhooks/owner-stripe/{user.accountId}
          </code>
          <p className="mt-1">Events: payment_intent.succeeded · use webhook signing secret in settings.</p>
          <div className="font-medium text-slate-800 mb-1 mt-3">Cashfree notify URL</div>
          <code className="break-all">
            {process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'}
            /api/webhooks/owner-cashfree/{user.accountId}
          </code>
          <p className="mt-2 text-slate-500">PayU &amp; CCAvenue use return URLs set automatically at payment time (hash/encrypt verified).</p>
        </div>

        <OwnerGatewayForm initial={gateway} />
      </main>
    </div>
  );
}
