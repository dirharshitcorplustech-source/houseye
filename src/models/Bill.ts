/**
 * HOUSEYE.COM — Bill model
 * Payment allocation priority (locked):
 * Fine → Previous Due → Rent → Electricity → Maintenance
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type BillStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'CANCELLED'
  | 'ADJUSTED';

export interface IBillLine {
  key: string; // fine | previousDue | rent | electricity | water | maintenance | maintenanceRecovery | other
  label: string;
  amount: number; // original
  paid: number; // allocated so far
  remaining: number;
}

export interface IBill extends Document {
  accountId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  unitId: mongoose.Types.ObjectId;
  tenancyId: mongoose.Types.ObjectId;
  tenantUserId?: mongoose.Types.ObjectId;

  billNumber: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  dueDate: Date;
  issuedAt?: Date;

  lines: IBillLine[];
  totalAmount: number;
  totalPaid: number;
  totalRemaining: number;
  advanceApplied: number;

  status: BillStatus;
  paymentLinkToken?: string;
  paymentLinkActive: boolean;

  // Snapshot context for PDF (concise)
  snapshot: {
    propertyName?: string;
    unitNumber?: string;
    floorName?: string;
    tenantName?: string;
    unitType?: string;
  };

  notes?: string;
  isEditable: boolean; // false once payment recorded (fully paid never editable)

  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BillLineSchema = new Schema<IBillLine>(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    amount: { type: Number, required: true },
    paid: { type: Number, default: 0 },
    remaining: { type: Number, required: true },
  },
  { _id: false }
);

const BillSchema = new Schema<IBill>(
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
      index: true,
    },
    tenancyId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenancy',
      required: true,
      index: true,
    },
    tenantUserId: { type: Schema.Types.ObjectId, ref: 'User' },

    billNumber: { type: String, required: true, unique: true },
    billingPeriodStart: { type: Date, required: true },
    billingPeriodEnd: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    issuedAt: Date,

    lines: { type: [BillLineSchema], default: [] },
    totalAmount: { type: Number, required: true },
    totalPaid: { type: Number, default: 0 },
    totalRemaining: { type: Number, required: true },
    advanceApplied: { type: Number, default: 0 },

    status: {
      type: String,
      enum: [
        'DRAFT',
        'ISSUED',
        'PARTIALLY_PAID',
        'PAID',
        'CANCELLED',
        'ADJUSTED',
      ],
      default: 'ISSUED',
      index: true,
    },
    paymentLinkToken: { type: String, index: true },
    paymentLinkActive: { type: Boolean, default: true },

    snapshot: {
      propertyName: String,
      unitNumber: String,
      floorName: String,
      tenantName: String,
      unitType: String,
    },

    notes: String,
    isEditable: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'bills',
  }
);

BillSchema.index({ accountId: 1, status: 1 });
BillSchema.index({ tenancyId: 1, billingPeriodStart: 1 });
BillSchema.index({ unitId: 1, status: 1 });

const Bill: Model<IBill> =
  mongoose.models.Bill || mongoose.model<IBill>('Bill', BillSchema);

export default Bill;
