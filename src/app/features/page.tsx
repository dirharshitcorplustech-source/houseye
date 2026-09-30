import Link from 'next/link';

const features = [
  {
    title: 'Multi-property structure',
    desc: 'Buildings, floors, units with vacancy tracking and soft-delete trash.',
  },
  {
    title: 'Team roles',
    desc: 'Owner, Admin, Manager with property scopes and custom permissions.',
  },
  {
    title: 'Billing & allocation',
    desc: 'Locked payment order: Fine → Due → Rent → Electricity → Maintenance.',
  },
  {
    title: 'Manual + online rent',
    desc: 'Tenants pay via proof or your own Razorpay keys — money stays with you.',
  },
  {
    title: 'Maintenance & meters',
    desc: 'Complaint lifecycle without delete; meter readings with previous check.',
  },
  {
    title: 'Documents & notices',
    desc: 'Private storage uploads and property announcements for tenants.',
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="font-bold text-houseye-primary text-lg">
            Houseye
          </Link>
          <div className="flex gap-4 text-sm">
            <Link href="/pricing" className="text-slate-600">
              Pricing
            </Link>
            <Link href="/register" className="text-houseye-primary font-medium">
              Register
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-slate-900">Features</h1>
        <p className="text-slate-500 mt-2 max-w-2xl">
          Property management SaaS built for Indian landlords — subscription to
          Houseye, rent collection on your merchant account.
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="border rounded-xl p-5">
              <h2 className="font-semibold text-slate-900">{f.title}</h2>
              <p className="text-sm text-slate-600 mt-2">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
