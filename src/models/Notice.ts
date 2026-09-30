/**
 * HOUSEYE.COM — Property / account notices
 * Visible to scoped staff and relevant tenants.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INotice extends Document {
  accountId: mongoose.Types.ObjectId;
  propertyId?: mongoose.Types.ObjectId; // null = all properties
  title: string;
  body: string;
  pinned: boolean;
  publishedAt: Date;
  expiresAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NoticeSchema = new Schema<INotice>(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      index: true,
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    pinned: { type: Boolean, default: false },
    publishedAt: { type: Date, default: Date.now },
    expiresAt: Date,
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    deletedAt: Date,
  },
  {
    timestamps: true,
    collection: 'notices',
  }
);

const Notice: Model<INotice> =
  mongoose.models.Notice || mongoose.model<INotice>('Notice', NoticeSchema);

export default Notice;
