'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function TrashItemButton({
  type,
  id,
  label = 'Move to Trash',
}: {
  type: 'property' | 'unit';
  id: string;
  label?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function run() {
    if (
      !confirm(
        type === 'property'
          ? 'Move this property and its units to Trash?'
          : 'Move this unit to Trash?'
      )
    ) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/trash', {
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
    <div>
      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="text-xs text-red-600 hover:underline disabled:opacity-50"
      >
        {loading ? '…' : label}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
