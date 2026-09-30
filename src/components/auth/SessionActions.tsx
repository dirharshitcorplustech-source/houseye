'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function SessionActions({
  sessionId,
  terminateOthers,
}: {
  sessionId?: string;
  terminateOthers?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      await fetch('/api/auth/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          terminateOthers
            ? { allOthers: true }
            : { sessionId }
        ),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (terminateOthers) {
    return (
      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="text-sm text-red-600 hover:underline disabled:opacity-50"
      >
        {loading ? '…' : 'End all other sessions'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={loading}
      className="text-xs px-2 py-1 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50"
    >
      {loading ? '…' : 'End'}
    </button>
  );
}
