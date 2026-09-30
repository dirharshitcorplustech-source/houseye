'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type TenancyOpt = { id: string; fullName: string; rent: number };

function monthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const due = new Date(now.getFullYear(), now.getMonth(), 10);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    due: due.toISOString().slice(0, 10),
  };
}

export function GenerateBillForm({ tenancies }: { tenancies: TenancyOpt[] }) {
  const router = useRouter();
  const range = monthRange();
  const [tenancyId, setTenancyId] = useState(tenancies[0]?.id || '');
  const [periodStart, setPeriodStart] = useState(range.start);
  const [periodEnd, setPeriodEnd] = useState(range.end);
  const [dueDate, setDueDate] = useState(range.due);
  const [electricity, setElectricity] = useState('');
  const [fine, setFine] = useState('');
  const [previousDue, setPreviousDue] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastBill, setLastBill] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenancyId,
          billingPeriodStart: periodStart,
          billingPeriodEnd: periodEnd,
          dueDate,
          electricityAmount: electricity ? Number(electricity) : undefined,
          fineAmount: fine ? Number(fine) : undefined,
          previousDue: previousDue ? Number(previousDue) : undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || 'Failed');
        setLoading(false);
        return;
      }
      setLastBill(data.data.bill.billNumber);
      router.refresh();
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  if (tenancies.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Add an active tenant before generating bills.
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border rounded-xl p-5 space-y-3"
    >
      <div className="font-medium text-slate-900">Generate bill</div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <select
          required
          value={tenancyId}
          onChange={(e) => setTenancyId(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
          disabled={loading}
        >
          {tenancies.map((t) => (
            <option key={t.id} value={t.id}>
              {t.fullName} (₹{t.rent})
            </option>
          ))}
        </select>
        <input
          type="date"
          value={periodStart}
          onChange={(e) => setPeriodStart(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
          disabled={loading}
        />
        <input
          type="date"
          value={periodEnd}
          onChange={(e) => setPeriodEnd(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
          disabled={loading}
        />
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
          disabled={loading}
        />
        <input
          type="number"
          placeholder="Electricity ₹"
          value={electricity}
          onChange={(e) => setElectricity(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
          disabled={loading}
        />
        <input
          type="number"
          placeholder="Fine ₹"
          value={fine}
          onChange={(e) => setFine(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
          disabled={loading}
        />
        <input
          type="number"
          placeholder="Previous due ₹"
          value={previousDue}
          onChange={(e) => setPreviousDue(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
          disabled={loading}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {lastBill && (
        <p className="text-sm text-green-700">Created {lastBill}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-houseye-primary text-white text-sm rounded-lg disabled:opacity-60"
      >
        {loading ? 'Generating…' : 'Generate bill'}
      </button>
    </form>
  );
}
