/**
 * HOUSEYE.COM — Password reset tokens (OTP / link)
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPasswordResetToken extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  method: 'EMAIL_OTP' | 'SMS_OTP' | 'EMAIL_LINK';
  otpHash?: string;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
}

const PasswordResetTokenSchema = new Schema<IPasswordResetToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: { type: String, required: true, unique: true, index: true },
    method: {
      type: String,
      enum: ['EMAIL_OTP', 'SMS_OTP', 'EMAIL_LINK'],
      required: true,
    },
    otpHash: { type: String, select: false },
    expiresAt: { type: Date, required: true },
    usedAt: Date,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'password_reset_tokens',
  }
);

PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const PasswordResetToken: Model<IPasswordResetToken> =
  mongoose.models.PasswordResetToken ||
  mongoose.model<IPasswordResetToken>(
    'PasswordResetToken',
    PasswordResetTokenSchema
  );

export default PasswordResetToken;
