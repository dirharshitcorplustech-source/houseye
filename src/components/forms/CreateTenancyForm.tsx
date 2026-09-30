'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Prop = { id: string; name: string };
type Unit = { id: string; unitNumber: string; propertyId: string };

export function CreateTenancyForm({
  properties,
  units,
}: {
  properties: Prop[];
  units: Unit[];
}) {
  const router = useRouter();
  const [propertyId, setPropertyId] = useState(properties[0]?.id || '');
  const [unitId, setUnitId] = useState('');
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [rent, setRent] = useState('');
  const [deposit, setDeposit] = useState('');
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [error, setError] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [loading, setLoading] = useState(false);

  const filteredUnits = useMemo(
    () => units.filter((u) => u.propertyId === propertyId),
    [units, propertyId]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInviteLink('');
    setLoading(true);

    try {
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          unitId,
          fullName,
          mobile: mobile || undefined,
          email: email || undefined,
          rent: Number(rent),
          securityDeposit: deposit ? Number(deposit) : undefined,
          startDate,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || 'Failed');
        setLoading(false);
        return;
      }
      setInviteLink(data.data.inviteLink || '');
      // Don't navigate away immediately so user can copy invite link
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  if (inviteLink) {
    return (
      <div className="bg-white border border-green-200 rounded-xl p-5 space-y-3">
        <p className="text-green-800 font-medium">Tenant added successfully.</p>
        <p className="text-sm text-slate-600">
          Share this invitation link so the tenant can set a password:
        </p>
        <code className="block text-xs bg-slate-50 p-3 rounded-lg break-all">
          {inviteLink}
        </code>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(inviteLink)}
          className="text-sm text-houseye-primary hover:underline"
        >
          Copy link
        </button>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => router.push('/dashboard/tenants')}
            className="px-4 py-2 bg-houseye-primary text-white text-sm rounded-lg"
          >
            Back to tenants
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Property
        </label>
        <select
          required
          value={propertyId}
          onChange={(e) => {
            setPropertyId(e.target.value);
            setUnitId('');
          }}
          className="w-full px-3 py-2 border rounded-lg text-sm"
          disabled={loading}
        >
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Vacant unit
        </label>
        <select
          required
          value={unitId}
          onChange={(e) => setUnitId(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm"
          disabled={loading}
        >
          <option value="">Select unit</option>
          {filteredUnits.map((u) => (
            <option key={u.id} value={u.id}>
              {u.unitNumber}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Full name
        </label>
        <input
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-houseye-primary"
          disabled={loading}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Mobile
          </label>
          <input
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            disabled={loading}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Monthly rent (₹)
          </label>
          <input
            type="number"
            required
            min={1}
            value={rent}
            onChange={(e) => setRent(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Security deposit (₹)
          </label>
          <input
            type="number"
            min={0}
            value={deposit}
            onChange={(e) => setDeposit(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            disabled={loading}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Move-in date
        </label>
        <input
          type="date"
          required
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm"
          disabled={loading}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-houseye-primary text-white font-medium rounded-lg hover:bg-blue-800 disabled:opacity-60"
      >
        {loading ? 'Creating…' : 'Add tenant'}
      </button>
    </form>
  );
}
