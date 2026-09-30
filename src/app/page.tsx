/**
 * HOUSEYE.COM — Public landing
 */

import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-xl font-bold text-houseye-primary">Houseye</div>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/features" className="text-slate-600 hover:text-slate-900">
              Features
            </Link>
            <Link href="/pricing" className="text-slate-600 hover:text-slate-900">
              Pricing
            </Link>
            <Link href="/login" className="font-medium text-slate-700 hover:text-houseye-primary">
              Login
            </Link>
            <Link
              href="/register"
              className="font-medium bg-houseye-primary text-white px-4 py-2 rounded-lg hover:bg-blue-800"
            >
              Start Free
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight">
            Property management,
            <br />
            <span className="text-houseye-primary">built for landlords</span>
          </h1>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            Bills, tenants, maintenance, and rent collection — subscription to
            Houseye, tenant payments on <strong>your</strong> gateway.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/register"
              className="px-6 py-3 bg-houseye-primary text-white rounded-xl font-medium"
            >
              Explore free
            </Link>
            <Link
              href="/pricing"
              className="px-6 py-3 bg-white border rounded-xl font-medium text-slate-800"
            >
              View pricing
            </Link>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 pb-20 grid sm:grid-cols-3 gap-4">
          {[
            ['Your merchant', 'Tenant rent settles to your Razorpay/Stripe — not Houseye.'],
            ['Locked allocation', 'Fine → Due → Rent → Electricity → Maintenance.'],
            ['Team ready', 'Owner, Admin, Manager scopes + tenant portal.'],
          ].map(([t, d]) => (
            <div key={t} className="bg-white border rounded-xl p-5 text-left">
              <div className="font-semibold text-slate-900">{t}</div>
              <p className="text-sm text-slate-600 mt-2">{d}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t bg-white py-6 text-center text-xs text-slate-500">
        <Link href="/terms" className="hover:underline">
          Terms
        </Link>
        {' · '}
        <Link href="/privacy" className="hover:underline">
          Privacy
        </Link>
        {' · '}
        © {new Date().getFullYear()} Houseye
      </footer>
    </div>
  );
}
