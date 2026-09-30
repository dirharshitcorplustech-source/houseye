/**
 * HOUSEYE.COM — Subscription invoice (Owner → Houseye)
 * Separate from tenant property bills.
 * Historical invoices immutable.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'FAILED' | 'VOID';

export interface IInvoiceLine {
  description: string;
  amount: number;
  quantity?: number;
}

export interface ISubscriptionInvoice extends Document {
  accountId: mongoose.Types.ObjectId;
  invoiceNumber: string;
  status: InvoiceStatus;

  planId: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;

  lines: IInvoiceLine[];
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  total: number;

  // Snapshot of billing profile at issue time (immutable)
  billingSnapshot: {
    name?: string;
    organizationName?: string;
    pan?: string;
    gstin?: string;
    address?: string;
    email?: string;
    mobile?: string;
  };

  paidAt?: Date;
  paymentRef?: string;

  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionInvoiceSchema = new Schema<ISubscriptionInvoice>(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },
    invoiceNumber: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['DRAFT', 'ISSUED', 'PAID', 'FAILED', 'VOID'],
      default: 'ISSUED',
      index: true,
    },
    planId: { type: String, required: true },
    billingPeriodStart: { type: Date, required: true },
    billingPeriodEnd: { type: Date, required: true },
    lines: [
      {
        description: String,
        amount: Number,
        quantity: Number,
      },
    ],
    subtotal: { type: Number, required: true },
    taxAmount: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 },
    total: { type: Number, required: true },
    billingSnapshot: {
      name: String,
      organizationName: String,
      pan: String,
      gstin: String,
      address: String,
      email: String,
      mobile: String,
    },
    paidAt: Date,
    paymentRef: String,
  },
  {
    timestamps: true,
    collection: 'subscription_invoices',
  }
);

const SubscriptionInvoice: Model<ISubscriptionInvoice> =
  mongoose.models.SubscriptionInvoice ||
  mongoose.model<ISubscriptionInvoice>(
    'SubscriptionInvoice',
    SubscriptionInvoiceSchema
  );

export default SubscriptionInvoice;
