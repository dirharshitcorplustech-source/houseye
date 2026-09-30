/**
 * HOUSEYE.COM — Owner Registration (Explore Mode)
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    accountType: 'INDIVIDUAL' as 'INDIVIDUAL' | 'ORGANIZATION',
    organizationName: '',
  });
  const [error, setError] = useState('');
  const [details, setDetails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setDetails([]);

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          mobile: form.mobile || undefined,
          password: form.password,
          accountType: form.accountType,
          organizationName:
            form.accountType === 'ORGANIZATION'
              ? form.organizationName
              : undefined,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error?.message || 'Registration failed');
        if (data.error?.details) setDetails(data.error.details);
        setLoading(false);
        return;
      }

      router.push(data.data.redirectTo || '/dashboard');
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-houseye-primary">
            Houseye
          </Link>
          <p className="mt-2 text-slate-600">Create your owner account</p>
          <p className="mt-1 text-xs text-slate-500">
            You start in Explore Mode. Subscribe later to unlock full features.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Account type
              </label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="accountType"
                    checked={form.accountType === 'INDIVIDUAL'}
                    onChange={() => update('accountType', 'INDIVIDUAL')}
                    disabled={loading}
                  />
                  Individual Owner
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="accountType"
                    checked={form.accountType === 'ORGANIZATION'}
                    onChange={() => update('accountType', 'ORGANIZATION')}
                    disabled={loading}
                  />
                  Organization
                </label>
              </div>
            </div>

            {form.accountType === 'ORGANIZATION' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Organization name
                </label>
                <input
                  type="text"
                  required
                  value={form.organizationName}
                  onChange={(e) => update('organizationName', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-houseye-primary outline-none"
                  disabled={loading}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Full name
              </label>
              <input
                type="text"
                required
                value={form.fullName}
                onChange={(e) => update('fullName', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-houseye-primary outline-none"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-houseye-primary outline-none"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Mobile <span className="text-slate-400">(optional)</span>
              </label>
              <input
                type="tel"
                value={form.mobile}
                onChange={(e) => update('mobile', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-houseye-primary outline-none"
                placeholder="10-digit mobile"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-houseye-primary outline-none"
                disabled={loading}
              />
              <p className="mt-1 text-xs text-slate-500">
                Min 8 characters, uppercase, lowercase, number
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Confirm password
              </label>
              <input
                type="password"
                required
                value={form.confirmPassword}
                onChange={(e) => update('confirmPassword', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-houseye-primary outline-none"
                disabled={loading}
              />
            </div>

            {error && (
              <div
                className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2"
                role="alert"
              >
                <p>{error}</p>
                {details.length > 0 && (
                  <ul className="mt-1 list-disc list-inside">
                    {details.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-houseye-primary text-white font-medium hover:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-houseye-primary font-medium hover:underline"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
