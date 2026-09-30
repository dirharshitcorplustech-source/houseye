'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CreateUnitForm({
  propertyId,
  floors,
}: {
  propertyId: string;
  floors: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [unitNumber, setUnitNumber] = useState('');
  const [unitType, setUnitType] = useState('FLAT');
  const [floorId, setFloorId] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/properties/${propertyId}/units`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitNumber,
          unitType,
          floorId: floorId || undefined,
          bedrooms: bedrooms ? Number(bedrooms) : undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || 'Failed');
        setLoading(false);
        return;
      }
      setUnitNumber('');
      setBedrooms('');
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
      className="bg-white border border-slate-200 rounded-xl p-4 space-y-3"
    >
      <div className="text-sm font-medium text-slate-900">Add unit</div>
      <div className="grid gap-2 sm:grid-cols-4">
        <input
          required
          placeholder="Unit no. (e.g. F-201)"
          value={unitNumber}
          onChange={(e) => setUnitNumber(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-houseye-primary"
          disabled={loading}
        />
        <select
          value={unitType}
          onChange={(e) => setUnitType(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
          disabled={loading}
        >
          <option value="FLAT">Flat</option>
          <option value="SHOP">Shop</option>
          <option value="OFFICE">Office</option>
          <option value="OTHER">Other</option>
        </select>
        <select
          value={floorId}
          onChange={(e) => setFloorId(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
          disabled={loading}
        >
          <option value="">Floor (optional)</option>
          {floors.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          placeholder="Bedrooms"
          value={bedrooms}
          onChange={(e) => setBedrooms(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-houseye-primary"
          disabled={loading}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-houseye-primary text-white text-sm rounded-lg hover:bg-blue-800 disabled:opacity-60"
      >
        {loading ? 'Adding…' : 'Add unit'}
      </button>
    </form>
  );
}
