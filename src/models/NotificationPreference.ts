/**
 * HOUSEYE.COM — User notification preferences
 * Preferences do NOT grant new permissions.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IChannelPref {
  email: boolean;
  whatsapp: boolean;
  sms: boolean;
  inApp: boolean;
}

export interface INotificationPreference extends Document {
  userId: mongoose.Types.ObjectId;
  accountId?: mongoose.Types.ObjectId;
  // event category → channels
  preferences: Map<string, IChannelPref> | Record<string, IChannelPref>;
  createdAt: Date;
  updatedAt: Date;
}

const ChannelPrefSchema = new Schema(
  {
    email: { type: Boolean, default: true },
    whatsapp: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    inApp: { type: Boolean, default: true },
  },
  { _id: false }
);

const NotificationPreferenceSchema = new Schema<INotificationPreference>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    accountId: { type: Schema.Types.ObjectId, ref: 'Account' },
    preferences: {
      type: Map,
      of: ChannelPrefSchema,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: 'notification_preferences',
  }
);

const NotificationPreference: Model<INotificationPreference> =
  mongoose.models.NotificationPreference ||
  mongoose.model<INotificationPreference>(
    'NotificationPreference',
    NotificationPreferenceSchema
  );

export default NotificationPreference;
