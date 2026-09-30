'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AdminCustomerActions({
  accountId,
  isSuspended,
  isDeactivated,
}: {
  accountId: string;
  isSuspended: boolean;
  isDeactivated: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [reason, setReason] = useState('');

  async function suspend() {
    if (!reason.trim()) {
      setMessage('Reason required');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/customers/${accountId}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      setMessage(data.message || data.error?.message || '');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function unsuspend() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/customers/${accountId}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unsuspend' }),
      });
      const data = await res.json();
      setMessage(data.message || data.error?.message || '');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function restore() {
    if (!confirm('Restore this deactivated account?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/customers/${accountId}/restore`, {
        method: 'POST',
      });
      const data = await res.json();
      setMessage(data.message || data.error?.message || '');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border rounded-xl p-4 space-y-3">
      <div className="font-medium text-slate-900 text-sm">Actions</div>
      {!isSuspended && !isDeactivated && (
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="text"
            placeholder="Suspension reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm"
            disabled={loading}
          />
          <button
            type="button"
            onClick={suspend}
            disabled={loading}
            className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg"
          >
            Suspend
          </button>
        </div>
      )}
      {isSuspended && (
        <button
          type="button"
          onClick={unsuspend}
          disabled={loading}
          className="px-3 py-1.5 text-sm bg-slate-800 text-white rounded-lg"
        >
          Unsuspend
        </button>
      )}
      {isDeactivated && (
        <button
          type="button"
          onClick={restore}
          disabled={loading}
          className="px-3 py-1.5 text-sm bg-houseye-primary text-white rounded-lg"
        >
          Approve restore
        </button>
      )}
      {message && <p className="text-xs text-slate-600">{message}</p>}
    </div>
  );
}
