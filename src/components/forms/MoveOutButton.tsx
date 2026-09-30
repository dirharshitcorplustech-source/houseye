'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function MoveOutButton({ tenancyId }: { tenancyId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleMoveOut() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/tenants/${tenancyId}/move-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || 'Failed');
        setLoading(false);
        return;
      }
      router.refresh();
      setConfirming(false);
    } catch {
      setError('Something went wrong');
      setLoading(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="px-4 py-2 border border-red-300 text-red-700 text-sm rounded-lg hover:bg-red-50"
      >
        Move out tenant
      </button>
    );
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
      <p className="text-sm text-red-900">
        This will mark the unit vacant, disable tenant login, and keep all
        historical records. Continue?
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleMoveOut}
          disabled={loading}
          className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-60"
        >
          {loading ? 'Processing…' : 'Confirm move-out'}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={loading}
          className="px-4 py-2 text-sm text-slate-600"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
