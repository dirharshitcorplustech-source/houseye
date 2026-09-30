'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CreateFloorForm({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/properties/${propertyId}/floors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || 'Failed');
        setLoading(false);
        return;
      }
      setName('');
      router.refresh();
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-center">
      <input
        required
        placeholder="Floor name (e.g. Ground, 1, 2)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-houseye-primary"
        disabled={loading}
      />
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-900 disabled:opacity-60"
      >
        {loading ? '…' : 'Add floor'}
      </button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </form>
  );
}
