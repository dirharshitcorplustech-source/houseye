/**
 * HOUSEYE.COM — Central email sender
 * Supports SMTP and Resend API. No-op log in development if unconfigured.
 */

import { isProductionLike } from '@/lib/config/env';

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
  from?: string;
}

export function isEmailConfigured(): boolean {
  if (process.env.RESEND_API_KEY) return true;
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER);
}

export async function sendEmail(
  input: SendEmailInput
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const from =
    input.from ||
    process.env.EMAIL_FROM ||
    process.env.SMTP_USER ||
    'notifications@houseye.com';

  if (!input.to || !input.subject) {
    return { success: false, error: 'to and subject required' };
  }

  // Resend
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [input.to],
          subject: input.subject,
          text: input.text,
          html: input.html || `<pre>${input.text}</pre>`,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        console.error('[Houseye] Resend error', t);
        return { success: false, error: 'Email provider error' };
      }
      const data = (await res.json()) as { id?: string };
      return { success: true, messageId: data.id };
    } catch (err) {
      console.error('[Houseye] Resend exception', err);
      return { success: false, error: 'Email send failed' };
    }
  }

  // SMTP via nodemailer (optional dependency)
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    try {
      // Dynamic import so build works without nodemailer installed in some envs
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const info = await transporter.sendMail({
        from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html || `<pre>${input.text}</pre>`,
      });

      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error('[Houseye] SMTP error', err);
      return { success: false, error: 'SMTP send failed' };
    }
  }

  // Development fallback: log only
  if (!isProductionLike()) {
    console.log('[Houseye] EMAIL (dev log):', {
      to: input.to,
      subject: input.subject,
      text: input.text.slice(0, 200),
    });
    return { success: true, messageId: 'dev-log' };
  }

  return {
    success: false,
    error: 'Email is not configured for production',
  };
}
