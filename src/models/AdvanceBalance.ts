/**
 * HOUSEYE.COM — Tenant advance credit (overpayment)
 * Visible to Owner, staff, and Tenant portal.
 * Applied on future bills.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAdvanceBalance extends Document {
  accountId: mongoose.Types.ObjectId;
  tenancyId: mongoose.Types.ObjectId;
  tenantUserId?: mongoose.Types.ObjectId;
  balance: number;
  updatedAt: Date;
  createdAt: Date;
}

const AdvanceBalanceSchema = new Schema<IAdvanceBalance>(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },
    tenancyId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenancy',
      required: true,
      unique: true,
    },
    tenantUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    balance: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
    collection: 'advance_balances',
  }
);

const AdvanceBalance: Model<IAdvanceBalance> =
  mongoose.models.AdvanceBalance ||
  mongoose.model<IAdvanceBalance>('AdvanceBalance', AdvanceBalanceSchema);

export default AdvanceBalance;
