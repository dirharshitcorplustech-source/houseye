'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function PaymentActions({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  async function approve() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/payments/${paymentId}/approve`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || 'Failed');
        setLoading(false);
        return;
      }
      router.refresh();
    } catch {
      setError('Something went wrong');
      setLoading(false);
    }
  }

  async function reject() {
    if (!reason.trim()) {
      setError('Rejection reason is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/payments/${paymentId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionReason: reason }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || 'Failed');
        setLoading(false);
        return;
      }
      router.refresh();
    } catch {
      setError('Something went wrong');
      setLoading(false);
    }
  }

  if (rejectOpen) {
    return (
      <div className="space-y-2 min-w-[180px]">
        <input
          type="text"
          placeholder="Rejection reason *"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full px-2 py-1 border rounded text-xs"
          disabled={loading}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={reject}
            disabled={loading}
            className="text-xs px-2 py-1 bg-red-600 text-white rounded"
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={() => setRejectOpen(false)}
            className="text-xs px-2 py-1 text-slate-600"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 items-center">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <button
        type="button"
        onClick={approve}
        disabled={loading}
        className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
      >
        Approve
      </button>
      <button
        type="button"
        onClick={() => setRejectOpen(true)}
        disabled={loading}
        className="text-xs px-2 py-1 border border-red-300 text-red-700 rounded hover:bg-red-50"
      >
        Reject
      </button>
    </div>
  );
}
