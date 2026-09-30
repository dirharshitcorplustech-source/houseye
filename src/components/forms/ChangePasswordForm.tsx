'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ChangePasswordForm() {
  const router = useRouter();
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [details, setDetails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setDetails([]);
    if (newPassword !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || 'Failed');
        if (data.error?.details) setDetails(data.error.details);
        setLoading(false);
        return;
      }
      router.push('/login');
      router.refresh();
    } catch {
      setError('Something went wrong');
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="bg-white border rounded-xl p-5 space-y-3"
    >
      <input
        type="password"
        required
        placeholder="Current password"
        value={currentPassword}
        onChange={(e) => setCurrent(e.target.value)}
        className="w-full px-3 py-2 border rounded-lg text-sm"
        disabled={loading}
      />
      <input
        type="password"
        required
        placeholder="New password"
        value={newPassword}
        onChange={(e) => setNew(e.target.value)}
        className="w-full px-3 py-2 border rounded-lg text-sm"
        disabled={loading}
      />
      <input
        type="password"
        required
        placeholder="Confirm new password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        className="w-full px-3 py-2 border rounded-lg text-sm"
        disabled={loading}
      />
      <p className="text-xs text-slate-500">
        Changing password signs you out of all devices.
      </p>
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
        className="px-4 py-2 bg-slate-900 text-white text-sm rounded-lg disabled:opacity-60"
      >
        {loading ? 'Updating…' : 'Update password'}
      </button>
    </form>
  );
}
