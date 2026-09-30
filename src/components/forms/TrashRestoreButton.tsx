'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function TrashRestoreButton({
  type,
  id,
}: {
  type: string;
  id: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function restore() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/trash/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id }),
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

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={restore}
        disabled={loading}
        className="text-xs px-3 py-1.5 bg-slate-800 text-white rounded-lg disabled:opacity-50"
      >
        {loading ? '…' : 'Restore'}
      </button>
      {error && <p className="text-xs text-red-600 mt-1 max-w-[160px]">{error}</p>}
    </div>
  );
}
