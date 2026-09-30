'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function StaffActions({
  userId,
  status,
}: {
  userId: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function run(action: string) {
    if (action === 'remove' && !confirm('Remove this staff member? Data they created is kept.')) {
      return;
    }
    setLoading(true);
    try {
      await fetch(`/api/team/staff/${userId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-1">
      {status === 'ACTIVE' && (
        <>
          <button
            type="button"
            onClick={() => run('suspend')}
            disabled={loading}
            className="text-xs px-2 py-1 border rounded-lg text-amber-700 border-amber-200"
          >
            Suspend
          </button>
          <button
            type="button"
            onClick={() => run('remove')}
            disabled={loading}
            className="text-xs px-2 py-1 border rounded-lg text-red-700 border-red-200"
          >
            Remove
          </button>
        </>
      )}
      {(status === 'SUSPENDED' || status === 'REMOVED') && (
        <button
          type="button"
          onClick={() => run('reactivate')}
          disabled={loading}
          className="text-xs px-2 py-1 border rounded-lg text-green-700 border-green-200"
        >
          Reactivate
        </button>
      )}
    </div>
  );
}
