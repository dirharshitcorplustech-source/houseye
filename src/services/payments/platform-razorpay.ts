/**
 * HOUSEYE PLATFORM gateway — subscription revenue only
 * Owner pays Houseye. Never used for tenant→owner rent.
 */

export {
  isRazorpayConfigured as isPlatformRazorpayConfigured,
  createRazorpayOrder as createPlatformSubscriptionOrder,
  verifyRazorpayWebhookSignature as verifyPlatformWebhookSignature,
  verifyRazorpayPaymentSignature as verifyPlatformPaymentSignature,
} from '@/services/payments/razorpay';
