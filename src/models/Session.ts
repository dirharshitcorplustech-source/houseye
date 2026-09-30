/**
 * HOUSEYE.COM — Active Session Tracking
 * Users can view & terminate individual sessions
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISession extends Document {
  sessionId: string;
  userId: mongoose.Types.ObjectId;
  accountId?: mongoose.Types.ObjectId;
  role: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  lastActiveAt: Date;
  expiresAt: Date;
  createdAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', index: true },
    role: { type: String, required: true },
    deviceInfo: String,
    ipAddress: String,
    userAgent: String,
    lastActiveAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'sessions',
  }
);

SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL

const Session: Model<ISession> =
  mongoose.models.Session || mongoose.model<ISession>('Session', SessionSchema);

export default Session;
