'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CreateExpenseForm({
  properties,
}: {
  properties: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [propertyId, setPropertyId] = useState(properties[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Maintenance');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          amount: Number(amount),
          category,
          description: description || undefined,
          expenseDate,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || 'Failed');
        setLoading(false);
        return;
      }
      setAmount('');
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
      <div className="text-sm font-medium">Add expense</div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <select
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
        <input
          type="number"
          required
          min={1}
          placeholder="Amount ₹"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
          disabled={loading}
        />
        <input
          required
          placeholder="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
          disabled={loading}
        />
        <input
          type="date"
          value={expenseDate}
          onChange={(e) => setExpenseDate(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
          disabled={loading}
        />
        <input
          placeholder="Note (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
          disabled={loading}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-houseye-primary text-white text-sm rounded-lg disabled:opacity-60"
      >
        {loading ? 'Saving…' : 'Save expense'}
      </button>
    </form>
  );
}
