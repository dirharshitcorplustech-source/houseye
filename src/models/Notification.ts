/**
 * HOUSEYE.COM — Notification record
 * Central provider architecture — Owners do NOT configure APIs.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type NotificationChannel = 'EMAIL' | 'SMS' | 'WHATSAPP' | 'IN_APP';
export type NotificationDeliveryStatus =
  | 'QUEUED'
  | 'PROCESSING'
  | 'SENT'
  | 'DELIVERED'
  | 'FAILED'
  | 'RETRY_SCHEDULED'
  | 'SKIPPED';

export interface INotification extends Document {
  accountId: mongoose.Types.ObjectId;
  ownerId?: mongoose.Types.ObjectId;
  propertyId?: mongoose.Types.ObjectId;
  unitId?: mongoose.Types.ObjectId;
  tenantId?: mongoose.Types.ObjectId;
  tenancyId?: mongoose.Types.ObjectId;

  notificationType: string; // bill_generated, payment_approved, etc.
  recipientUserId?: mongoose.Types.ObjectId;
  recipientEmail?: string;
  recipientPhone?: string;

  senderIdentity: string; // billing@houseye.com etc.
  subject?: string;
  message: string;
  link?: string;

  channel: NotificationChannel;
  status: NotificationDeliveryStatus;
  providerMessageId?: string;
  failureReason?: string;
  retryCount: number;

  // External channels count toward quota; IN_APP and EMAIL default do not (per plan notes: email not in external quota)
  countsTowardQuota: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User' },
    propertyId: { type: Schema.Types.ObjectId, ref: 'Property' },
    unitId: { type: Schema.Types.ObjectId, ref: 'Unit' },
    tenantId: { type: Schema.Types.ObjectId, ref: 'User' },
    tenancyId: { type: Schema.Types.ObjectId, ref: 'Tenancy' },

    notificationType: { type: String, required: true, index: true },
    recipientUserId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    recipientEmail: String,
    recipientPhone: String,

    senderIdentity: { type: String, default: 'notifications@houseye.com' },
    subject: String,
    message: { type: String, required: true },
    link: String,

    channel: {
      type: String,
      enum: ['EMAIL', 'SMS', 'WHATSAPP', 'IN_APP'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        'QUEUED',
        'PROCESSING',
        'SENT',
        'DELIVERED',
        'FAILED',
        'RETRY_SCHEDULED',
        'SKIPPED',
      ],
      default: 'QUEUED',
      index: true,
    },
    providerMessageId: String,
    failureReason: String,
    retryCount: { type: Number, default: 0 },
    countsTowardQuota: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'notifications',
  }
);

NotificationSchema.index({ recipientUserId: 1, createdAt: -1 });
NotificationSchema.index({ accountId: 1, status: 1 });

const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;
