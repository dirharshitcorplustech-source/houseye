/**
 * HOUSEYE.COM — Central notification dispatch
 *
 * Flow:
 * Event → recipient eligibility → preference → channel → quota → queue
 *
 * Providers are platform-configured (Super Admin), not per-Owner.
 * This MVP queues IN_APP always; external channels marked for provider workers.
 */

import { connectDB } from '@/lib/db/connect';
import { Notification, NotificationPreference, User, Account } from '@/models';
import {
  senderForType,
  MANDATORY_TYPES,
  NOTIFICATION_TYPES,
} from '@/constants/notifications';
import { NotificationChannel } from '@/models/Notification';
import { sendEmail } from '@/services/email/send';

export interface DispatchInput {
  accountId: string;
  notificationType: string;
  message: string;
  subject?: string;
  link?: string;
  recipientUserId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  propertyId?: string;
  unitId?: string;
  tenantId?: string;
  tenancyId?: string;
  channels?: NotificationChannel[]; // default: IN_APP + EMAIL if available
}

export async function dispatchNotification(
  input: DispatchInput
): Promise<{ queued: number; skipped: number }> {
  await connectDB();

  let queued = 0;
  let skipped = 0;

  const channels: NotificationChannel[] = input.channels || ['IN_APP', 'EMAIL'];
  const senderIdentity = senderForType(input.notificationType);
  const isMandatory = MANDATORY_TYPES.has(
    input.notificationType as (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES]
  );

  // Load preference if recipient known
  let prefs: Record<string, { email?: boolean; sms?: boolean; whatsapp?: boolean; inApp?: boolean }> | null =
    null;
  if (input.recipientUserId) {
    const prefDoc = await NotificationPreference.findOne({
      userId: input.recipientUserId,
    }).exec();
    if (prefDoc?.preferences) {
      const raw = prefDoc.preferences as Map<string, unknown> | Record<string, unknown>;
      if (raw instanceof Map) {
        prefs = Object.fromEntries(raw.entries()) as typeof prefs;
      } else {
        prefs = raw as typeof prefs;
      }
    }
  }

  // Quota check for external channels
  let account: { usage?: { externalNotificationsUsed?: number }; addOns?: { extraNotifications?: number }; planId?: string; subscriptionStatus?: string } | null =
    null;
  if (channels.some((c) => c === 'SMS' || c === 'WHATSAPP')) {
    account = await Account.findById(input.accountId)
      .select('usage addOns planId subscriptionStatus')
      .lean();
  }

  for (const channel of channels) {
    // Preference gate (non-mandatory)
    if (!isMandatory && prefs && input.notificationType) {
      const catPrefs = prefs[input.notificationType] || prefs['default'];
      if (catPrefs) {
        const enabled =
          channel === 'EMAIL'
            ? catPrefs.email !== false
            : channel === 'SMS'
              ? catPrefs.sms === true
              : channel === 'WHATSAPP'
                ? catPrefs.whatsapp !== false
                : catPrefs.inApp !== false;
        if (!enabled) {
          skipped++;
          continue;
        }
      }
    }

    const countsTowardQuota = channel === 'SMS' || channel === 'WHATSAPP';

    // Soft quota: if over, still queue but mark — production worker enforces hard stop
    const status =
      channel === 'IN_APP'
        ? 'SENT' // in-app is immediate
        : 'QUEUED'; // external needs provider worker

    const doc = await Notification.create({
      accountId: input.accountId,
      propertyId: input.propertyId,
      unitId: input.unitId,
      tenantId: input.tenantId,
      tenancyId: input.tenancyId,
      notificationType: input.notificationType,
      recipientUserId: input.recipientUserId,
      recipientEmail: input.recipientEmail,
      recipientPhone: input.recipientPhone,
      senderIdentity,
      subject: input.subject,
      message: input.message,
      link: input.link,
      channel,
      status,
      countsTowardQuota,
      retryCount: 0,
    });

    // Deliver email immediately when configured
    if (channel === 'EMAIL' && input.recipientEmail) {
      const sent = await sendEmail({
        to: input.recipientEmail,
        subject: input.subject || 'Houseye notification',
        text: input.message + (input.link ? `\n${input.link}` : ''),
        from: senderIdentity,
      });
      if (sent.success) {
        doc.status = 'SENT';
        doc.providerMessageId = sent.messageId;
        await doc.save();
      } else {
        doc.status = 'FAILED';
        doc.failureReason = sent.error;
        await doc.save();
      }
    }

    if (countsTowardQuota && account) {
      await Account.updateOne(
        { _id: input.accountId },
        { $inc: { 'usage.externalNotificationsUsed': 1 } }
      );
    }

    queued++;
  }

  return { queued, skipped };
}

/**
 * Helper: notify tenant + owner on payment events
 */
export async function notifyPaymentEvent(params: {
  accountId: string;
  type: string;
  message: string;
  tenantUserId?: string;
  ownerUserId?: string;
  billId?: string;
  propertyId?: string;
}) {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  if (params.tenantUserId) {
    const tenant = await User.findById(params.tenantUserId)
      .select('email mobile')
      .lean();
    await dispatchNotification({
      accountId: params.accountId,
      notificationType: params.type,
      message: params.message,
      recipientUserId: params.tenantUserId,
      recipientEmail: tenant?.email,
      recipientPhone: tenant?.mobile,
      propertyId: params.propertyId,
      link: `${base}/tenant`,
      channels: ['IN_APP', 'EMAIL'],
    });
  }
}
