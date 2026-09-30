import Link from 'next/link';

const plans = [
  {
    id: 'ESSENTIAL',
    name: 'Essential',
    price: '₹999',
    period: '/month',
    features: ['Up to 20 units', '1 Admin', '2 Managers', 'Core billing', 'Email alerts'],
  },
  {
    id: 'PROFESSIONAL',
    name: 'Professional',
    price: '₹2,499',
    period: '/month',
    features: [
      'Up to 100 units',
      '3 Admins',
      '10 Managers',
      'Online rent collection',
      'Documents & meters',
    ],
    highlight: true,
  },
  {
    id: 'BUSINESS',
    name: 'Business',
    price: '₹5,999',
    period: '/month',
    features: [
      'Up to 500 units',
      '10 Admins',
      'Unlimited managers*',
      'Priority support',
      'Higher storage',
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="font-bold text-houseye-primary text-lg">
            Houseye
          </Link>
          <div className="flex gap-4 text-sm">
            <Link href="/features" className="text-slate-600">
              Features
            </Link>
            <Link href="/login" className="text-houseye-primary font-medium">
              Login
            </Link>
            <Link
              href="/register"
              className="bg-houseye-primary text-white px-3 py-1.5 rounded-lg"
            >
              Start free
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-center text-slate-900">
          Simple pricing for landlords
        </h1>
        <p className="text-center text-slate-500 mt-2 text-sm">
          Explore free · Subscribe when ready · Tenant rent uses your own gateway
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.id}
              className={`bg-white border rounded-2xl p-6 ${
                p.highlight ? 'border-houseye-primary shadow-md' : ''
              }`}
            >
              <div className="font-semibold text-slate-900">{p.name}</div>
              <div className="mt-2">
                <span className="text-3xl font-bold">{p.price}</span>
                <span className="text-slate-500 text-sm">{p.period}</span>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                {p.features.map((f) => (
                  <li key={f}>✓ {f}</li>
                ))}
              </ul>
              <Link
                href="/register"
                className="mt-6 block text-center py-2 rounded-lg bg-slate-900 text-white text-sm font-medium"
              >
                Get started
              </Link>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
