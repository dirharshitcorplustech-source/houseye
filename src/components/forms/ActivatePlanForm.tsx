'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export function ActivatePlanForm({ planId }: { planId: string }) {
  const router = useRouter();
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function loadRazorpayScript(): Promise<boolean> {
    if (window.Razorpay) return true;
    return new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });
  }

  async function activate() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, cycle }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || 'Failed');
        setLoading(false);
        return;
      }

      // Dev path — already activated
      if (data.data?.mode === 'dev_activate') {
        setDone(true);
        router.refresh();
        return;
      }

      // Razorpay checkout
      if (data.data?.mode === 'razorpay') {
        const ok = await loadRazorpayScript();
        if (!ok || !window.Razorpay) {
          setError('Could not load Razorpay checkout');
          setLoading(false);
          return;
        }

        const options = {
          key: data.data.keyId,
          amount: data.data.amount,
          currency: data.data.currency,
          name: 'Houseye',
          description: `${data.data.planName} (${cycle})`,
          order_id: data.data.orderId,
          handler: async function (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) {
            const verify = await fetch('/api/subscriptions/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...response,
                planId,
                cycle,
              }),
            });
            const v = await verify.json();
            if (!v.success) {
              setError(v.error?.message || 'Verification failed');
              setLoading(false);
              return;
            }
            setDone(true);
            router.refresh();
          },
          modal: {
            ondismiss: function () {
              setLoading(false);
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
        return;
      }

      setError('Unexpected checkout response');
      setLoading(false);
    } catch {
      setError('Something went wrong');
      setLoading(false);
    }
  }

  if (done) {
    return (
      <p className="text-sm text-green-700 font-medium">Activated ✓</p>
    );
  }

  return (
    <div className="space-y-2">
      <select
        value={cycle}
        onChange={(e) => setCycle(e.target.value as 'monthly' | 'annual')}
        className="w-full text-sm border rounded-lg px-2 py-1.5"
        disabled={loading}
      >
        <option value="monthly">Monthly</option>
        <option value="annual">Annual</option>
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="button"
        onClick={activate}
        disabled={loading}
        className="w-full py-2 text-sm font-medium bg-houseye-primary text-white rounded-lg hover:bg-blue-800 disabled:opacity-60"
      >
        {loading ? 'Processing…' : 'Subscribe'}
      </button>
    </div>
  );
}
