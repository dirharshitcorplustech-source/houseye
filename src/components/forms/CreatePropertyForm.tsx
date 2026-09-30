/**
 * HOUSEYE.COM — Create Property form
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CreatePropertyForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [propertyType, setPropertyType] = useState('RESIDENTIAL');
  const [city, setCity] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          propertyType,
          address: city ? { city } : undefined,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error?.message || 'Failed to create property');
        setLoading(false);
        return;
      }

      setName('');
      setCity('');
      router.refresh();
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
    >
      <div className="font-medium text-slate-900">Add property</div>
      <div className="grid gap-3 sm:grid-cols-3">
        <input
          type="text"
          required
          placeholder="Property name (e.g. Pearl)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-houseye-primary"
          disabled={loading}
        />
        <select
          value={propertyType}
          onChange={(e) => setPropertyType(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-houseye-primary"
          disabled={loading}
        >
          <option value="RESIDENTIAL">Residential</option>
          <option value="COMMERCIAL">Commercial</option>
          <option value="MIXED_USE">Mixed-use</option>
        </select>
        <input
          type="text"
          placeholder="City (optional)"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-houseye-primary"
          disabled={loading}
        />
      </div>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-houseye-primary text-white text-sm font-medium rounded-lg hover:bg-blue-800 disabled:opacity-60"
      >
        {loading ? 'Creating…' : 'Create property'}
      </button>
    </form>
  );
}
