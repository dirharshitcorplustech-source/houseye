/**
 * HOUSEYE.COM — Accept invitation (Manager / Admin / Tenant)
 */

'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [details, setDetails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setDetails([]);

    if (!token) {
      setError('Missing invitation token');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error?.message || 'Failed to accept invitation');
        if (data.error?.details) setDetails(data.error.details);
        setLoading(false);
        return;
      }

      router.push(data.data.redirectTo || '/dashboard');
      router.refresh();
    } catch {
      setError('Something went wrong');
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center text-slate-600">
        <p>Invalid invitation link.</p>
        <Link href="/login" className="text-houseye-primary hover:underline mt-4 inline-block">
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-slate-600">
        Set a password to activate your account.
      </p>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Password
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-houseye-primary"
          disabled={loading}
        />
        <p className="mt-1 text-xs text-slate-500">
          Min 8 chars, uppercase, lowercase, number
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Confirm password
        </label>
        <input
          type="password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-houseye-primary"
          disabled={loading}
        />
      </div>
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
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
        className="w-full py-2.5 rounded-lg bg-houseye-primary text-white font-medium hover:bg-blue-800 disabled:opacity-60"
      >
        {loading ? 'Activating…' : 'Activate account'}
      </button>
    </form>
  );
}

export default function AcceptInvitePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-houseye-primary">
            Houseye
          </Link>
          <p className="mt-2 text-slate-600">Accept invitation</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
            <AcceptInviteForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
