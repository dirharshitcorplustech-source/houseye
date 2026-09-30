/**
 * HOUSEYE.COM — Subscription management UI
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/get-session';
import { connectDB } from '@/lib/db/connect';
import { Account } from '@/models';
import { getEffectiveLimits, getUsage } from '@/services/entitlement';
import { PLAN_LIMITS, PLAN_PRICING, PLAN_NAMES } from '@/constants/plans';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { ActivatePlanForm } from '@/components/forms/ActivatePlanForm';
import { CancelSubscriptionButton } from '@/components/forms/CancelSubscriptionButton';
import { PlanId } from '@/types';

export default async function SubscriptionPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role === 'TENANT') redirect('/tenant');
  if (user.role !== 'OWNER' && !user.isSuperAdmin) {
    redirect('/dashboard');
  }

  await connectDB();
  const account = await Account.findById(user.accountId).lean();
  if (!account) redirect('/dashboard');

  const limits = await getEffectiveLimits(user.accountId!);
  const usage = await getUsage(user.accountId!);

  const isActive = account.subscriptionStatus === 'ACTIVE';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <Link href="/dashboard" className="font-bold text-houseye-primary text-lg">
              Houseye
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">Subscription</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900">Subscription</h1>

        {/* Current status */}
        <div className="mt-6 bg-white border rounded-xl p-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-slate-500">Status</span>
            <span
              className={`text-sm font-semibold px-2 py-0.5 rounded ${
                isActive
                  ? 'bg-green-50 text-green-700'
                  : 'bg-amber-50 text-amber-800'
              }`}
            >
              {account.subscriptionStatus}
            </span>
            {account.planId && (
              <span className="text-sm text-slate-700">
                {PLAN_NAMES[account.planId as PlanId] || account.planId}
              </span>
            )}
          </div>
          {isActive && account.subscriptionEndAt && (
            <p className="mt-2 text-sm text-slate-500">
              Current period ends{' '}
              {new Date(account.subscriptionEndAt).toLocaleDateString('en-IN')}
              {account.autoRenew ? ' · Auto-renew on' : ' · Auto-renew off'}
            </p>
          )}

          {usage && limits && isActive && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              {(
                [
                  ['Properties', usage.properties, limits.properties],
                  ['Units', usage.units, limits.units],
                  ['Tenants', usage.primaryTenants, limits.primaryTenants],
                  ['Admins', usage.admins, limits.admins],
                  ['Managers', usage.managers, limits.managers],
                ] as const
              ).map(([label, used, limit]) => (
                <div key={label} className="bg-slate-50 rounded-lg px-3 py-2">
                  <div className="text-slate-500 text-xs">{label}</div>
                  <div className="font-medium">
                    {used} / {limit}
                  </div>
                </div>
              ))}
            </div>
          )}

          {isActive && (
            <div className="mt-4">
              <CancelSubscriptionButton />
            </div>
          )}
        </div>

        {/* Plans */}
        <h2 className="mt-10 text-lg font-semibold text-slate-900">
          {isActive ? 'Change plan' : 'Choose a plan'}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Local/dev activation works without a payment gateway. Production requires
          verified payment before activation.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {(Object.keys(PLAN_LIMITS) as PlanId[]).map((planId) => {
            const limitsP = PLAN_LIMITS[planId];
            const price = PLAN_PRICING[planId];
            return (
              <div
                key={planId}
                className="bg-white border rounded-xl p-5 flex flex-col"
              >
                <div className="font-semibold text-slate-900">
                  {PLAN_NAMES[planId]}
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-900">
                  ₹{price.monthly.toLocaleString('en-IN')}
                  <span className="text-sm font-normal text-slate-500">/mo</span>
                </div>
                <ul className="mt-3 text-sm text-slate-600 space-y-1 flex-1">
                  <li>{limitsP.properties} properties</li>
                  <li>{limitsP.units} units</li>
                  <li>{limitsP.primaryTenants} tenants</li>
                  <li>{limitsP.admins} admins · {limitsP.managers} managers</li>
                  <li>{limitsP.storageGB} GB storage</li>
                  <li>{limitsP.externalNotifications} notifications/mo</li>
                </ul>
                <div className="mt-4">
                  <ActivatePlanForm planId={planId} />
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
