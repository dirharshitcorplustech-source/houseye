/**
 * HOUSEYE.COM — Idempotency keys for financial / webhook ops
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IIdempotencyKey extends Document {
  key: string;
  scope: string; // e.g. payment.approve, webhook.razorpay
  accountId?: mongoose.Types.ObjectId;
  responseStatus: number;
  responseBody: Record<string, unknown>;
  createdAt: Date;
  expiresAt: Date;
}

const IdempotencyKeySchema = new Schema<IIdempotencyKey>(
  {
    key: { type: String, required: true, index: true },
    scope: { type: String, required: true },
    accountId: { type: Schema.Types.ObjectId, ref: 'Account' },
    responseStatus: { type: Number, required: true },
    responseBody: { type: Schema.Types.Mixed, required: true },
    expiresAt: { type: Date, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'idempotency_keys',
  }
);

IdempotencyKeySchema.index({ key: 1, scope: 1 }, { unique: true });
IdempotencyKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const IdempotencyKey: Model<IIdempotencyKey> =
  mongoose.models.IdempotencyKey ||
  mongoose.model<IIdempotencyKey>('IdempotencyKey', IdempotencyKeySchema);

export default IdempotencyKey;
