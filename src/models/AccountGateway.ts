/**
 * HOUSEYE.COM — Owner-configured payment gateway
 *
 * Architecture:
 * - Houseye platform keys → subscription fees only (Owner → Houseye)
 * - Account gateway keys → tenant rent/dues only (Tenant → Owner)
 * - Notifications always use Houseye platform providers
 *
 * Secrets stored encrypted. Never returned in full via API.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type OwnerGatewayProvider =
  | 'RAZORPAY'
  | 'STRIPE'
  | 'PAYU'
  | 'CASHFREE'
  | 'CCAVENUE'
  | 'NONE';

export interface IAccountGateway extends Document {
  accountId: mongoose.Types.ObjectId;
  provider: OwnerGatewayProvider;
  enabled: boolean;

  /** Encrypted */
  keyIdEnc?: string;
  keySecretEnc?: string;
  webhookSecretEnc?: string;

  /** Display only */
  keyIdLast4?: string;
  /** Optional display label e.g. PayU merchant */
  merchantLabel?: string;
  mode: 'test' | 'live';

  /** Online collection toggles for tenants */
  allowOnlineRent: boolean;
  allowPartialOnline: boolean;

  verifiedAt?: Date;
  lastError?: string;

  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AccountGatewaySchema = new Schema<IAccountGateway>(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      unique: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ['RAZORPAY', 'STRIPE', 'PAYU', 'CASHFREE', 'CCAVENUE', 'NONE'],
      default: 'NONE',
    },
    enabled: { type: Boolean, default: false },
    keyIdEnc: { type: String, select: false },
    keySecretEnc: { type: String, select: false },
    webhookSecretEnc: { type: String, select: false },
    keyIdLast4: String,
    merchantLabel: String,
    mode: { type: String, enum: ['test', 'live'], default: 'test' },
    allowOnlineRent: { type: Boolean, default: true },
    allowPartialOnline: { type: Boolean, default: true },
    verifiedAt: Date,
    lastError: String,
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'account_gateways',
  }
);

const AccountGateway: Model<IAccountGateway> =
  mongoose.models.AccountGateway ||
  mongoose.model<IAccountGateway>('AccountGateway', AccountGatewaySchema);

export default AccountGateway;
