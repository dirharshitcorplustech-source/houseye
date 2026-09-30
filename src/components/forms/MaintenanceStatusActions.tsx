'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const NEXT: Record<string, string[]> = {
  SUBMITTED: ['ACKNOWLEDGED', 'IN_PROGRESS'],
  ACKNOWLEDGED: ['IN_PROGRESS', 'RESOLVED'],
  IN_PROGRESS: ['RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
};

export function MaintenanceStatusActions({
  requestId,
  currentStatus,
}: {
  requestId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const options = NEXT[currentStatus] || [];

  async function setStatus(status: string) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/maintenance/${requestId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || 'Failed');
        setLoading(false);
        return;
      }
      router.refresh();
    } catch {
      setError('Error');
      setLoading(false);
    }
  }

  if (options.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {options.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => setStatus(s)}
          disabled={loading}
          className="text-xs px-2 py-1 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
        >
          → {s}
        </button>
      ))}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
