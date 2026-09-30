'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [method, setMethod] = useState<'EMAIL_LINK' | 'EMAIL_OTP' | 'SMS_OTP'>(
    'EMAIL_LINK'
  );
  const [message, setMessage] = useState('');
  const [devToken, setDevToken] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail, method }),
      });
      const data = await res.json();
      setMessage(data.message || data.error?.message || '');
      if (data.data?.devToken) setDevToken(data.data.devToken);
      if (data.data?.devOtp) setDevOtp(data.data.devOtp);
    } catch {
      setMessage('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-houseye-primary">
            Houseye
          </Link>
          <p className="mt-2 text-slate-600">Reset password</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Username or email
              </label>
              <input
                required
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-houseye-primary"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Method
              </label>
              <select
                value={method}
                onChange={(e) =>
                  setMethod(e.target.value as typeof method)
                }
                className="w-full px-3 py-2 border rounded-lg text-sm"
                disabled={loading}
              >
                <option value="EMAIL_LINK">Email link</option>
                <option value="EMAIL_OTP">Email OTP</option>
                <option value="SMS_OTP">SMS OTP</option>
              </select>
            </div>
            {message && (
              <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                {message}
              </p>
            )}
            {devToken && (
              <div className="text-xs bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
                <p className="font-medium text-amber-900">Dev only</p>
                <p className="break-all">Token: {devToken}</p>
                {devOtp && <p>OTP: {devOtp}</p>}
                <button
                  type="button"
                  className="text-houseye-primary underline"
                  onClick={() =>
                    router.push(
                      `/reset-password?token=${encodeURIComponent(devToken)}`
                    )
                  }
                >
                  Continue to reset
                </button>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-houseye-primary text-white rounded-lg font-medium disabled:opacity-60"
            >
              {loading ? 'Sending…' : 'Send reset'}
            </button>
          </form>
          <p className="mt-4 text-center text-sm">
            <Link href="/login" className="text-houseye-primary hover:underline">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
