'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ExpenseActions({
  expenseId,
  amount,
  category,
}: {
  expenseId: string;
  amount: number;
  category: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [amt, setAmt] = useState(String(amount));
  const [cat, setCat] = useState(category);

  async function save() {
    setLoading(true);
    try {
      await fetch(`/api/expenses/${expenseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(amt), category: cat }),
      });
      setEditing(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!confirm('Delete this expense?')) return;
    setLoading(true);
    try {
      await fetch(`/api/expenses/${expenseId}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (editing) {
    return (
      <div className="flex flex-wrap gap-1 items-center">
        <input
          className="w-20 border rounded px-1 text-xs"
          value={amt}
          onChange={(e) => setAmt(e.target.value)}
        />
        <input
          className="w-24 border rounded px-1 text-xs"
          value={cat}
          onChange={(e) => setCat(e.target.value)}
        />
        <button
          type="button"
          onClick={save}
          disabled={loading}
          className="text-xs text-green-700"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-xs text-slate-500"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-xs text-slate-600 hover:underline"
        disabled={loading}
      >
        Edit
      </button>
      <button
        type="button"
        onClick={remove}
        className="text-xs text-red-600 hover:underline"
        disabled={loading}
      >
        Delete
      </button>
    </div>
  );
}
