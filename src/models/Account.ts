/**
 * HOUSEYE.COM — Customer Account Model
 * Individual Owner or Organization
 * Subscription is applied at Account level
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import { AccountType, SubscriptionStatus, PlanId } from '@/types';

export interface IAccount extends Document {
  accountType: AccountType;
  name: string;
  organizationName?: string;

  // Billing profile
  pan?: string;
  gstin?: string;
  billingAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pin?: string;
    country?: string;
  };
  billingEmail?: string;
  billingMobile?: string;

  // Subscription
  subscriptionStatus: SubscriptionStatus;
  planId?: PlanId;
  subscriptionStartAt?: Date;
  subscriptionEndAt?: Date;
  autoRenew: boolean;
  cancelledAt?: Date;

  // Resource usage (cached for quick checks)
  usage: {
    properties: number;
    units: number;
    primaryTenants: number;
    admins: number;
    managers: number;
    storageBytes: number;
    externalNotificationsUsed: number;
  };

  // Add-ons
  addOns: {
    extraUnits: number;
    extraAdmins: number;
    extraManagers: number;
    extraStorageGB: number;
    extraNotifications: number;
  };

  // Account lifecycle
  deletionRequestedAt?: Date;
  deletionReason?: string;
  deletionApprovedAt?: Date;
  deactivatedAt?: Date;
  restoredAt?: Date;

  // Suspension (Super Admin)
  isSuspended: boolean;
  suspensionReason?: string;
  suspendedAt?: Date;
  suspendedBy?: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const AccountSchema = new Schema<IAccount>(
  {
    accountType: {
      type: String,
      enum: ['INDIVIDUAL', 'ORGANIZATION'],
      required: true,
    },
    name: { type: String, required: true, trim: true },
    organizationName: { type: String, trim: true },

    pan: { type: String, trim: true, uppercase: true },
    gstin: { type: String, trim: true, uppercase: true },
    billingAddress: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      pin: String,
      country: { type: String, default: 'IN' },
    },
    billingEmail: { type: String, trim: true, lowercase: true },
    billingMobile: { type: String, trim: true },

    subscriptionStatus: {
      type: String,
      enum: [
        'EXPLORE',
        'ACTIVE',
        'EXPIRED',
        'CANCELLED',
        'PENDING_PAYMENT',
        'DELETION_PENDING',
      ],
      default: 'EXPLORE',
    },
    planId: {
      type: String,
      enum: ['ESSENTIAL', 'PROFESSIONAL', 'BUSINESS'],
    },
    subscriptionStartAt: Date,
    subscriptionEndAt: Date,
    autoRenew: { type: Boolean, default: true },
    cancelledAt: Date,

    usage: {
      properties: { type: Number, default: 0 },
      units: { type: Number, default: 0 },
      primaryTenants: { type: Number, default: 0 },
      admins: { type: Number, default: 0 },
      managers: { type: Number, default: 0 },
      storageBytes: { type: Number, default: 0 },
      externalNotificationsUsed: { type: Number, default: 0 },
    },

    addOns: {
      extraUnits: { type: Number, default: 0 },
      extraAdmins: { type: Number, default: 0 },
      extraManagers: { type: Number, default: 0 },
      extraStorageGB: { type: Number, default: 0 },
      extraNotifications: { type: Number, default: 0 },
    },

    deletionRequestedAt: Date,
    deletionReason: String,
    deletionApprovedAt: Date,
    deactivatedAt: Date,
    restoredAt: Date,

    isSuspended: { type: Boolean, default: false },
    suspensionReason: String,
    suspendedAt: Date,
    suspendedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'accounts',
  }
);

// Indexes
AccountSchema.index({ subscriptionStatus: 1 });
AccountSchema.index({ planId: 1 });
AccountSchema.index({ isSuspended: 1 });
AccountSchema.index({ deletionRequestedAt: 1 });
AccountSchema.index({ createdAt: -1 });

const Account: Model<IAccount> =
  mongoose.models.Account || mongoose.model<IAccount>('Account', AccountSchema);

export default Account;
