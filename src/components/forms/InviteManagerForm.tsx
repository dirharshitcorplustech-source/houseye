'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function InviteManagerForm({
  properties,
}: {
  properties: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [propertyId, setPropertyId] = useState(properties[0]?.id || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inviteLink, setInviteLink] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/team/managers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email: email || undefined,
          propertyIds: propertyId ? [propertyId] : [],
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || 'Failed');
        setLoading(false);
        return;
      }
      setInviteLink(data.data.inviteLink);
      setFullName('');
      setEmail('');
      router.refresh();
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border rounded-xl p-4 space-y-3">
      <div className="text-sm font-medium">Invite Manager</div>
      <form onSubmit={submit} className="flex flex-wrap gap-2">
        <input
          required
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
          disabled={loading}
        />
        <input
          type="email"
          placeholder="Email (optional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
          disabled={loading}
        />
        <select
          required
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
          disabled={loading}
        >
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-slate-800 text-white text-sm rounded-lg disabled:opacity-60"
        >
          {loading ? '…' : 'Invite'}
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {inviteLink && (
        <div className="text-xs bg-green-50 border border-green-100 rounded-lg p-2 break-all">
          Invite link: {inviteLink}
        </div>
      )}
    </div>
  );
}
