'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function SubmitMeterForm({
  units,
}: {
  units: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [unitId, setUnitId] = useState(units[0]?.id || '');
  const [reading, setReading] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/meter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitId,
          reading: Number(reading),
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || 'Failed');
        setLoading(false);
        return;
      }
      setReading('');
      setNotes('');
      router.refresh();
    } catch {
      setError('Error');
    } finally {
      setLoading(false);
    }
  }

  if (!units.length) {
    return (
      <p className="text-sm text-slate-500">Add units before submitting readings.</p>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="bg-white border rounded-xl p-4 space-y-3 text-sm"
    >
      <div className="font-medium">New reading</div>
      <select
        value={unitId}
        onChange={(e) => setUnitId(e.target.value)}
        className="w-full px-3 py-2 border rounded-lg"
        disabled={loading}
      >
        {units.map((u) => (
          <option key={u.id} value={u.id}>
            {u.label}
          </option>
        ))}
      </select>
      <input
        type="number"
        step="any"
        required
        placeholder="Current reading"
        value={reading}
        onChange={(e) => setReading(e.target.value)}
        className="w-full px-3 py-2 border rounded-lg"
        disabled={loading}
      />
      <input
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="w-full px-3 py-2 border rounded-lg"
        disabled={loading}
      />
      {error && <p className="text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-houseye-primary text-white rounded-lg disabled:opacity-60"
      >
        {loading ? 'Saving…' : 'Submit reading'}
      </button>
    </form>
  );
}
