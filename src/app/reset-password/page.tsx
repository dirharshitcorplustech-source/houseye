'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const [token, setToken] = useState(tokenFromUrl);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [details, setDetails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setDetails([]);
    if (newPassword !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          otp: otp || undefined,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || 'Failed');
        if (data.error?.details) setDetails(data.error.details);
        setLoading(false);
        return;
      }
      setDone(true);
    } catch {
      setError('Something went wrong');
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="text-center space-y-3">
        <p className="text-green-700 font-medium">Password updated.</p>
        <Link
          href="/login"
          className="text-houseye-primary font-medium hover:underline"
        >
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!tokenFromUrl && (
        <div>
          <label className="block text-sm font-medium mb-1">Reset token</label>
          <input
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            disabled={loading}
          />
        </div>
      )}
      <div>
        <label className="block text-sm font-medium mb-1">
          OTP <span className="text-slate-400">(if using OTP method)</span>
        </label>
        <input
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm"
          disabled={loading}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">New password</label>
        <input
          type="password"
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm"
          disabled={loading}
        />
        <p className="text-xs text-slate-500 mt-1">
          Min 8, uppercase, lowercase, number
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Confirm</label>
        <input
          type="password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm"
          disabled={loading}
        />
      </div>
      {error && (
        <div className="text-sm text-red-600">
          <p>{error}</p>
          {details.map((d) => (
            <p key={d}>{d}</p>
          ))}
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-houseye-primary text-white rounded-lg font-medium disabled:opacity-60"
      >
        {loading ? 'Updating…' : 'Update password'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-houseye-primary">
            Houseye
          </Link>
          <p className="mt-2 text-slate-600">Set new password</p>
        </div>
        <div className="bg-white rounded-xl border p-6">
          <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
