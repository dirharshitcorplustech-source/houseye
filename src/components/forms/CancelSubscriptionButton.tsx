'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CancelSubscriptionButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function cancel() {
    if (!confirm('Turn off auto-renew? Current period stays active until end.')) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/subscriptions/cancel', { method: 'POST' });
      const data = await res.json();
      setMessage(data.message || data.error?.message || '');
      router.refresh();
    } catch {
      setMessage('Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={cancel}
        disabled={loading}
        className="text-sm text-red-600 hover:underline disabled:opacity-50"
      >
        {loading ? '…' : 'Turn off auto-renew'}
      </button>
      {message && <p className="text-xs text-slate-500 mt-1">{message}</p>}
    </div>
  );
}
