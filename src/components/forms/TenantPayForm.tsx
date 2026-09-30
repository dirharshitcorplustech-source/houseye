'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export function TenantPayForm({
  billId,
  maxAmount,
  totalAmount,
}: {
  billId: string;
  maxAmount: number;
  totalAmount: number;
}) {
  const router = useRouter();
  const [payMode, setPayMode] = useState<'manual' | 'online'>('manual');
  const [mode, setMode] = useState<'full' | 'partial'>('full');
  const [amount, setAmount] = useState(String(maxAmount));
  const [method, setMethod] = useState('UPI');
  const [ref, setRef] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [doneMsg, setDoneMsg] = useState('');

  async function loadRazorpay(): Promise<boolean> {
    if (window.Razorpay) return true;
    return new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });
  }

  async function submitManual(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const payAmount = mode === 'full' ? maxAmount : Number(amount);
    if (!payAmount || payAmount <= 0) {
      setError('Enter a valid amount');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billId,
          amount: payAmount,
          method,
          transactionRef: ref || undefined,
          note: note || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || 'Failed');
        setLoading(false);
        return;
      }
      setDoneMsg(
        'Payment proof submitted. Owner will approve or reject.'
      );
      setDone(true);
      router.refresh();
    } catch {
      setError('Something went wrong');
      setLoading(false);
    }
  }

  async function payOnline() {
    setError('');
    setLoading(true);
    const payAmount = mode === 'full' ? maxAmount : Number(amount);
    if (!payAmount || payAmount <= 0) {
      setError('Enter a valid amount');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/payments/online/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billId, amount: payAmount }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(
          data.error?.message ||
            'Online payment not available. Use manual proof.'
        );
        setLoading(false);
        return;
      }

      // Stripe Checkout (hosted redirect)
      if (data.data.provider === 'STRIPE' && data.data.checkoutUrl) {
        window.location.href = data.data.checkoutUrl as string;
        return;
      }

      // PayU — auto POST form
      if (data.data.provider === 'PAYU' && data.data.payuActionUrl && data.data.payuFields) {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = data.data.payuActionUrl as string;
        const fields = data.data.payuFields as Record<string, string>;
        Object.entries(fields).forEach(([k, v]) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = k;
          input.value = v;
          form.appendChild(input);
        });
        document.body.appendChild(form);
        form.submit();
        return;
      }

      // CCAvenue — auto POST
      if (
        data.data.provider === 'CCAVENUE' &&
        data.data.ccavenueActionUrl &&
        data.data.ccavenueEncRequest
      ) {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = data.data.ccavenueActionUrl as string;
        const a = document.createElement('input');
        a.type = 'hidden';
        a.name = 'encRequest';
        a.value = data.data.ccavenueEncRequest as string;
        form.appendChild(a);
        const b = document.createElement('input');
        b.type = 'hidden';
        b.name = 'access_code';
        b.value = data.data.ccavenueAccessCode as string;
        form.appendChild(b);
        document.body.appendChild(form);
        form.submit();
        return;
      }

      // Cashfree — JS SDK checkout
      if (data.data.provider === 'CASHFREE' && data.data.cashfreePaymentSessionId) {
        const mode = data.data.cashfreeMode === 'live' ? 'production' : 'sandbox';
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
          s.onload = () => resolve();
          s.onerror = () => reject();
          document.body.appendChild(s);
        }).catch(() => {
          setError('Could not load Cashfree SDK');
          setLoading(false);
        });
        // @ts-expect-error Cashfree global
        const cashfree = window.Cashfree?.({ mode });
        if (!cashfree) {
          setError('Cashfree SDK unavailable');
          setLoading(false);
          return;
        }
        cashfree.checkout({
          paymentSessionId: data.data.cashfreePaymentSessionId,
          redirectTarget: '_self',
        });
        return;
      }

      if (data.data.provider === 'STRIPE' && data.data.paymentIntentId) {
        const confirm = await fetch('/api/payments/online/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: 'STRIPE',
            paymentId: data.data.paymentId,
            paymentIntentId: data.data.paymentIntentId,
          }),
        });
        const v = await confirm.json();
        if (v.success) {
          setDoneMsg('Payment successful.');
          setDone(true);
          router.refresh();
          return;
        }
        setError(v.error?.message || 'Stripe confirmation failed');
        setLoading(false);
        return;
      }

      const ok = await loadRazorpay();
      if (!ok || !window.Razorpay) {
        setError('Could not load payment checkout');
        setLoading(false);
        return;
      }

      const rzp = new window.Razorpay({
        key: data.data.keyId,
        amount: data.data.amount,
        currency: data.data.currency,
        name: 'Rent payment',
        description: 'Pay your property bill',
        order_id: data.data.orderId,
        handler: async function (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) {
          const confirm = await fetch('/api/payments/online/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider: 'RAZORPAY',
              paymentId: data.data.paymentId,
              ...response,
            }),
          });
          const v = await confirm.json();
          if (!v.success) {
            setError(v.error?.message || 'Verification failed');
            setLoading(false);
            return;
          }
          setDoneMsg('Payment successful. Receipt will appear on your bill.');
          setDone(true);
          router.refresh();
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
      });
      rzp.open();
    } catch {
      setError('Something went wrong');
      setLoading(false);
    }
  }

  if (done) {
    return (
      <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
        {doneMsg}
      </p>
    );
  }

  return (
    <div className="border-t pt-3 space-y-3">
      <div className="flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => setPayMode('manual')}
          className={`px-3 py-1 rounded-lg border ${
            payMode === 'manual'
              ? 'bg-houseye-primary text-white border-houseye-primary'
              : 'border-slate-200'
          }`}
        >
          Manual proof
        </button>
        <button
          type="button"
          onClick={() => setPayMode('online')}
          className={`px-3 py-1 rounded-lg border ${
            payMode === 'online'
              ? 'bg-houseye-primary text-white border-houseye-primary'
              : 'border-slate-200'
          }`}
        >
          Pay online
        </button>
      </div>

      <div className="flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => {
            setMode('full');
            setAmount(String(maxAmount));
          }}
          className={`px-3 py-1 rounded-lg border ${
            mode === 'full'
              ? 'bg-slate-800 text-white border-slate-800'
              : 'border-slate-200'
          }`}
        >
          Full (₹{maxAmount.toLocaleString('en-IN')})
        </button>
        <button
          type="button"
          onClick={() => setMode('partial')}
          className={`px-3 py-1 rounded-lg border ${
            mode === 'partial'
              ? 'bg-slate-800 text-white border-slate-800'
              : 'border-slate-200'
          }`}
        >
          Partial
        </button>
      </div>

      {mode === 'partial' && (
        <input
          type="number"
          min={1}
          max={maxAmount}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm"
          placeholder="Amount"
          disabled={loading}
        />
      )}

      {payMode === 'manual' ? (
        <form onSubmit={submitManual} className="space-y-2">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            disabled={loading}
          >
            <option value="UPI">UPI</option>
            <option value="BANK_TRANSFER">Bank transfer</option>
            <option value="CASH">Cash</option>
            <option value="OTHER">Other</option>
          </select>
          <input
            type="text"
            placeholder="Transaction / UPI ref (optional)"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            disabled={loading}
          />
          <input
            type="text"
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            disabled={loading}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-houseye-primary text-white text-sm font-medium rounded-lg disabled:opacity-60"
          >
            {loading ? 'Submitting…' : 'Submit payment proof'}
          </button>
        </form>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">
            Online pay uses the property owner&apos;s payment account. Houseye
            does not receive this money.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="button"
            onClick={payOnline}
            disabled={loading}
            className="w-full py-2 bg-green-700 text-white text-sm font-medium rounded-lg disabled:opacity-60"
          >
            {loading ? 'Opening checkout…' : 'Pay online now'}
          </button>
        </div>
      )}
    </div>
  );
}
