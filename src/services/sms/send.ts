/**
 * HOUSEYE.COM — SMS sender (optional)
 * MSG91-style HTTP API or log in dev.
 */

import { isProductionLike } from '@/lib/config/env';

export function isSmsConfigured(): boolean {
  return !!(process.env.SMS_API_KEY && process.env.SMS_SENDER_ID);
}

export async function sendSms(input: {
  to: string;
  message: string;
}): Promise<{ success: boolean; error?: string }> {
  const to = input.to.replace(/\s/g, '');
  if (!to || !input.message) {
    return { success: false, error: 'to and message required' };
  }

  if (!isSmsConfigured()) {
    if (!isProductionLike()) {
      console.log('[Houseye] SMS (dev log):', { to, message: input.message });
      return { success: true };
    }
    return { success: false, error: 'SMS not configured' };
  }

  const provider = process.env.SMS_PROVIDER || 'msg91';

  try {
    if (provider === 'msg91') {
      // Generic MSG91 flow — adjust template ID in env for DLT
      const url = new URL('https://control.msg91.com/api/v5/flow/');
      // Fallback simple send endpoint pattern
      const res = await fetch('https://api.msg91.com/api/v2/sendsms', {
        method: 'POST',
        headers: {
          authkey: process.env.SMS_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: process.env.SMS_SENDER_ID,
          route: '4',
          country: '91',
          sms: [{ message: input.message, to: [to.replace(/^\+91/, '')] }],
        }),
      });
      if (!res.ok) {
        console.error('[Houseye] SMS provider error', await res.text());
        return { success: false, error: 'SMS provider error' };
      }
      return { success: true };
    }

    console.warn('[Houseye] Unknown SMS_PROVIDER', provider);
    return { success: false, error: 'Unknown SMS provider' };
  } catch (err) {
    console.error('[Houseye] SMS exception', err);
    return { success: false, error: 'SMS send failed' };
  }
}
