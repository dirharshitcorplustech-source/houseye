/**
 * HOUSEYE.COM — Tenant Property Payment
 * Separate from Houseye subscription payments.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type PaymentStatus =
  | 'PENDING'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'FAILED'
  | 'CANCELLED';

export type PaymentMethod =
  | 'CASH'
  | 'UPI'
  | 'BANK_TRANSFER'
  | 'GATEWAY'
  | 'OTHER';

export interface IPaymentAllocationLine {
  key: string;
  label: string;
  amount: number;
}

export interface IPayment extends Document {
  accountId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  unitId: mongoose.Types.ObjectId;
  tenancyId: mongoose.Types.ObjectId;
  billId: mongoose.Types.ObjectId;
  tenantUserId?: mongoose.Types.ObjectId;

  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;

  // Manual proof
  proofFileKey?: string; // S3 key later
  proofFileName?: string;
  transactionRef?: string;
  paymentDate?: Date;
  note?: string;

  // Review
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;

  // After approval
  allocation?: IPaymentAllocationLine[];
  advanceCreated?: number; // overpayment → advance
  receiptNumber?: string;

  // Gateway
  gatewayRef?: string;
  gatewayStatus?: string;

  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
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
      required: true,
      index: true,
    },
    unitId: {
      type: Schema.Types.ObjectId,
      ref: 'Unit',
      required: true,
    },
    tenancyId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenancy',
      required: true,
      index: true,
    },
    billId: {
      type: Schema.Types.ObjectId,
      ref: 'Bill',
      required: true,
      index: true,
    },
    tenantUserId: { type: Schema.Types.ObjectId, ref: 'User', index: true },

    amount: { type: Number, required: true, min: 0 },
    method: {
      type: String,
      enum: ['CASH', 'UPI', 'BANK_TRANSFER', 'GATEWAY', 'OTHER'],
      default: 'UPI',
    },
    status: {
      type: String,
      enum: [
        'PENDING',
        'SUBMITTED',
        'APPROVED',
        'REJECTED',
        'FAILED',
        'CANCELLED',
      ],
      default: 'SUBMITTED',
      index: true,
    },

    proofFileKey: String,
    proofFileName: String,
    transactionRef: String,
    paymentDate: Date,
    note: String,

    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    rejectionReason: String,

    allocation: [
      {
        key: String,
        label: String,
        amount: Number,
      },
    ],
    advanceCreated: { type: Number, default: 0 },
    receiptNumber: { type: String, sparse: true },

    gatewayRef: String,
    gatewayStatus: String,

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'payments',
  }
);

PaymentSchema.index({ billId: 1, status: 1 });
PaymentSchema.index({ accountId: 1, createdAt: -1 });

const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);

export default Payment;
