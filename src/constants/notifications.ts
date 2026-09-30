/**
 * HOUSEYE.COM — Notification types, senders, categories
 */

export const SENDER_IDENTITIES = {
  billing: 'billing@houseye.com',
  payments: 'payments@houseye.com',
  utilities: 'utilities@houseye.com',
  maintenance: 'maintenance@houseye.com',
  security: 'security@houseye.com',
  notifications: 'notifications@houseye.com',
} as const;

export const NOTIFICATION_TYPES = {
  BILL_GENERATED: 'bill_generated',
  RENT_DUE: 'rent_due',
  OUTSTANDING_DUES: 'outstanding_dues',
  PAYMENT_SUBMITTED: 'payment_submitted',
  PAYMENT_APPROVED: 'payment_approved',
  PAYMENT_REJECTED: 'payment_rejected',
  PAYMENT_FAILED: 'payment_failed',
  MAINTENANCE_SUBMITTED: 'maintenance_submitted',
  MAINTENANCE_STATUS: 'maintenance_status_changed',
  SUBSCRIPTION_EXPIRY: 'subscription_expiry',
  RENEWAL_FAILURE: 'renewal_failure',
  SECURITY_ALERT: 'security_alert',
  INVITATION: 'invitation',
} as const;

/** Categories for preference UI */
export const EVENT_CATEGORIES = {
  billing: [
    NOTIFICATION_TYPES.BILL_GENERATED,
    NOTIFICATION_TYPES.RENT_DUE,
    NOTIFICATION_TYPES.OUTSTANDING_DUES,
  ],
  payments: [
    NOTIFICATION_TYPES.PAYMENT_SUBMITTED,
    NOTIFICATION_TYPES.PAYMENT_APPROVED,
    NOTIFICATION_TYPES.PAYMENT_REJECTED,
    NOTIFICATION_TYPES.PAYMENT_FAILED,
  ],
  maintenance: [
    NOTIFICATION_TYPES.MAINTENANCE_SUBMITTED,
    NOTIFICATION_TYPES.MAINTENANCE_STATUS,
  ],
  subscription: [
    NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRY,
    NOTIFICATION_TYPES.RENEWAL_FAILURE,
  ],
  security: [NOTIFICATION_TYPES.SECURITY_ALERT],
} as const;

/** Mandatory — user cannot fully disable */
export const MANDATORY_TYPES = new Set([
  NOTIFICATION_TYPES.SECURITY_ALERT,
  NOTIFICATION_TYPES.INVITATION,
]);

export function senderForType(type: string): string {
  if (type.startsWith('bill') || type.includes('rent') || type.includes('due')) {
    return SENDER_IDENTITIES.billing;
  }
  if (type.startsWith('payment')) return SENDER_IDENTITIES.payments;
  if (type.startsWith('maintenance')) return SENDER_IDENTITIES.maintenance;
  if (type.includes('subscription') || type.includes('renewal')) {
    return SENDER_IDENTITIES.billing;
  }
  if (type.includes('security')) return SENDER_IDENTITIES.security;
  return SENDER_IDENTITIES.notifications;
}
