'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type GatewayPublic = {
  provider: string;
  enabled: boolean;
  mode: string;
  allowOnlineRent: boolean;
  allowPartialOnline: boolean;
  keyIdMasked: string | null;
  verifiedAt?: Date | string | null;
  lastError?: string | null;
};

export function OwnerGatewayForm({ initial }: { initial: GatewayPublic }) {
  const router = useRouter();
  const [provider, setProvider] = useState(initial.provider || 'NONE');
  const [keyId, setKeyId] = useState('');
  const [keySecret, setKeySecret] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [mode, setMode] = useState(initial.mode || 'test');
  const [enabled, setEnabled] = useState(initial.enabled);
  const [allowOnlineRent, setAllowOnline] = useState(initial.allowOnlineRent);
  const [allowPartialOnline, setAllowPartial] = useState(
    initial.allowPartialOnline
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/settings/gateway', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          keyId: keyId || undefined,
          keySecret: keySecret || undefined,
          webhookSecret: webhookSecret || undefined,
          mode,
          enabled: provider !== 'NONE' && enabled,
          allowOnlineRent,
          allowPartialOnline,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || 'Failed');
        setLoading(false);
        return;
      }
      setMessage('Saved. Keys are encrypted; full secret is never shown again.');
      setKeyId('');
      setKeySecret('');
      setWebhookSecret('');
      router.refresh();
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={save}
      className="bg-white border rounded-xl p-5 space-y-4 text-sm"
    >
      <div className="font-medium text-slate-900">Online gateway (optional)</div>

      {initial.keyIdMasked && (
        <p className="text-xs text-slate-500">
          Current Key ID: {initial.keyIdMasked}
          {initial.enabled ? ' · Enabled' : ' · Disabled'}
        </p>
      )}

      <div>
        <label className="block text-slate-600 mb-1">Provider</label>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
          disabled={loading}
        >
          <option value="NONE">None — manual payments only</option>
          <option value="RAZORPAY">Razorpay (your account)</option>
          <option value="STRIPE">Stripe (your account)</option>
          <option value="PAYU">PayU (your account)</option>
          <option value="CASHFREE">Cashfree (your account)</option>
          <option value="CCAVENUE">CCAvenue (your account)</option>
        </select>
      </div>

      {provider !== 'NONE' && (
        <>
          <p className="text-xs text-slate-500">
            {provider === 'RAZORPAY' && 'Key ID = rzp_… · Key Secret = secret · Webhook = webhook secret'}
            {provider === 'STRIPE' && 'Key ID = pk_… · Key Secret = sk_… · Webhook = whsec_…'}
            {provider === 'PAYU' && 'Key ID = merchant key · Key Secret = salt'}
            {provider === 'CASHFREE' && 'Key ID = x-client-id · Key Secret = x-client-secret'}
            {provider === 'CCAVENUE' && 'Key ID = merchant_id · Key Secret = working key · Webhook field = access_code'}
          </p>
          <div>
            <label className="block text-slate-600 mb-1">
              Key ID {initial.keyIdMasked ? '(leave blank to keep)' : '*'}
            </label>
            <input
              value={keyId}
              onChange={(e) => setKeyId(e.target.value)}
              placeholder="rzp_live_… or rzp_test_…"
              className="w-full px-3 py-2 border rounded-lg font-mono text-xs"
              disabled={loading}
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-slate-600 mb-1">
              Key Secret {initial.keyIdMasked ? '(leave blank to keep)' : '*'}
            </label>
            <input
              type="password"
              value={keySecret}
              onChange={(e) => setKeySecret(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg font-mono text-xs"
              disabled={loading}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-slate-600 mb-1">
              Webhook secret (optional)
            </label>
            <input
              type="password"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg font-mono text-xs"
              disabled={loading}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-slate-600 mb-1">Mode</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              disabled={loading}
            >
              <option value="test">Test</option>
              <option value="live">Live</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              disabled={loading}
            />
            Enable online collection for my tenants
          </label>
          <label className="flex items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              checked={allowOnlineRent}
              onChange={(e) => setAllowOnline(e.target.checked)}
              disabled={loading}
            />
            Allow tenants to pay bills online
          </label>
          <label className="flex items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              checked={allowPartialOnline}
              onChange={(e) => setAllowPartial(e.target.checked)}
              disabled={loading}
            />
            Allow partial online payment
          </label>
        </>
      )}

      {error && <p className="text-red-600">{error}</p>}
      {message && <p className="text-green-700">{message}</p>}

      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-houseye-primary text-white rounded-lg disabled:opacity-60"
      >
        {loading ? 'Saving…' : 'Save'}
      </button>
    </form>
  );
}
