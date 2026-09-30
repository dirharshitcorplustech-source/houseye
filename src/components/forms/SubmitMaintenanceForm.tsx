'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function SubmitMaintenanceForm({
  categories,
}: {
  categories: string[];
}) {
  const router = useRouter();
  const [category, setCategory] = useState(categories[0] || 'Other');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, description }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || 'Failed');
        setLoading(false);
        return;
      }
      setDone(true);
      setDescription('');
      router.refresh();
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="bg-white border rounded-xl p-4 space-y-3"
    >
      <div className="font-medium text-slate-900 text-sm">New request</div>
      <p className="text-xs text-slate-500">
        Priority is set automatically. You cannot delete a request — it closes
        through the status lifecycle.
      </p>
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="w-full px-3 py-2 border rounded-lg text-sm"
        disabled={loading}
      >
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <textarea
        required
        minLength={5}
        rows={3}
        placeholder="Describe the issue…"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-houseye-primary"
        disabled={loading}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {done && (
        <p className="text-sm text-green-700">Request submitted.</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 bg-houseye-primary text-white text-sm font-medium rounded-lg disabled:opacity-60"
      >
        {loading ? 'Submitting…' : 'Submit request'}
      </button>
    </form>
  );
}
