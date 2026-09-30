'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CreateNoticeForm({
  properties,
}: {
  properties: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [pinned, setPinned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body,
          propertyId: propertyId || undefined,
          pinned,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || 'Failed');
        setLoading(false);
        return;
      }
      setTitle('');
      setBody('');
      setPinned(false);
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
      <div className="text-sm font-medium">Publish notice</div>
      <input
        required
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full px-3 py-2 border rounded-lg text-sm"
        disabled={loading}
      />
      <textarea
        required
        rows={3}
        placeholder="Message"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="w-full px-3 py-2 border rounded-lg text-sm"
        disabled={loading}
      />
      <div className="flex flex-wrap gap-3 items-center text-sm">
        <select
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
          disabled={loading}
        >
          <option value="">All properties</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-slate-600">
          <input
            type="checkbox"
            checked={pinned}
            onChange={(e) => setPinned(e.target.checked)}
            disabled={loading}
          />
          Pin
        </label>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-houseye-primary text-white text-sm rounded-lg disabled:opacity-60"
      >
        {loading ? 'Publishing…' : 'Publish'}
      </button>
    </form>
  );
}
