import Link from 'next/link';

export default function PrivacyPage() {
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
        <h1>Privacy Policy</h1>
        <p className="text-sm text-slate-500">Last updated: 2026-09-29</p>
        <p>
          Houseye (&quot;we&quot;) processes personal data to operate the
          property management platform.
        </p>
        <h2>1. Data we collect</h2>
        <ul>
          <li>Account identity (name, email, mobile, username)</li>
          <li>Property, unit, tenancy, and billing records you enter</li>
          <li>Payment metadata from gateways (not full card numbers)</li>
          <li>Technical logs (IP, device, security events)</li>
        </ul>
        <h2>2. How we use data</h2>
        <p>
          To provide the service, process subscriptions, send transactional
          notifications, prevent fraud, and improve reliability.
        </p>
        <h2>3. Sharing</h2>
        <p>
          We use processors such as hosting, email, SMS, and payment providers
          under contractual safeguards. We do not sell personal data.
        </p>
        <h2>4. Retention</h2>
        <p>
          Account deletion follows a waiting period after which access is
          deactivated. Backups may persist for a limited operational window.
          Audit and financial records may be retained as required by law.
        </p>
        <h2>5. Security</h2>
        <p>
          We use encryption in transit, access controls, and private object
          storage for documents. No method of transmission is 100% secure.
        </p>
        <h2>6. Your rights</h2>
        <p>
          Depending on jurisdiction you may request access, correction, or
          deletion subject to legal exceptions. Contact privacy@houseye.com.
        </p>
        <p className="text-sm text-slate-500">
          Have counsel review for GDPR/DPDP Act alignment before broad public
          launch.
        </p>
      </main>
    </div>
  );
}
