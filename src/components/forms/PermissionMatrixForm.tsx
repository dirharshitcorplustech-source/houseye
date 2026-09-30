'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function PermissionMatrixForm({
  userId,
  name,
  username,
  role,
  current,
  allPermissions,
}: {
  userId: string;
  name: string;
  username: string;
  role: string;
  current: string[];
  allPermissions: { key: string; label: string }[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set(current));
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  function toggle(key: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  }

  async function save() {
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch(`/api/team/staff/${userId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: Array.from(selected) }),
      });
      const data = await res.json();
      if (!data.success) {
        setMsg(data.error?.message || 'Failed');
      } else {
        setMsg('Saved');
        router.refresh();
      }
    } catch {
      setMsg('Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border rounded-xl p-4 space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <div className="font-medium text-slate-900">{name}</div>
          <div className="text-xs text-slate-500">
            {username} · {role}
          </div>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={loading}
          className="text-sm px-3 py-1.5 bg-houseye-primary text-white rounded-lg disabled:opacity-60"
        >
          {loading ? '…' : 'Save'}
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-64 overflow-y-auto text-sm">
        {allPermissions.map((p) => (
          <label
            key={p.key}
            className="flex items-center gap-2 py-1 text-slate-700"
          >
            <input
              type="checkbox"
              checked={selected.has(p.key)}
              onChange={() => toggle(p.key)}
              disabled={loading}
            />
            <span className="text-xs">{p.label}</span>
          </label>
        ))}
      </div>
      {msg && <p className="text-xs text-slate-600">{msg}</p>}
    </div>
  );
}
