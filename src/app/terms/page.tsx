import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link href="/" className="font-bold text-houseye-primary text-lg">
            Houseye
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-10 prose prose-slate">
        <h1>Terms of Service</h1>
        <p className="text-sm text-slate-500">Last updated: 2026-09-29</p>
        <p>
          Houseye provides multi-tenant property management software as a
          service. By creating an account you agree to these terms.
        </p>
        <h2>1. Accounts</h2>
        <p>
          You are responsible for safeguarding credentials and for activity
          under your account. Owners control staff and tenant access within
          their subscription.
        </p>
        <h2>2. Subscriptions & billing</h2>
        <p>
          Paid plans are billed according to the selected cycle. Fees are
          non-refundable except where required by law. Failure to pay may
          suspend operational features while historical data is retained per
          our retention policy.
        </p>
        <h2>3. Acceptable use</h2>
        <p>
          You may not misuse the service, attempt unauthorized access, or
          process unlawful content. We may suspend accounts that violate these
          terms.
        </p>
        <h2>4. Data</h2>
        <p>
          You retain ownership of property and tenant data you upload. We
          process data to provide the service. See our Privacy Policy.
        </p>
        <h2>5. Limitation of liability</h2>
        <p>
          The service is provided as-is. To the maximum extent permitted by
          law, Houseye is not liable for indirect or consequential damages
          arising from use of the platform.
        </p>
        <h2>6. Contact</h2>
        <p>Questions: support@houseye.com</p>
        <p className="text-sm text-slate-500">
          This template is operational baseline text — have counsel review
          before high-scale commercial launch in your jurisdiction.
        </p>
      </main>
    </div>
  );
}
