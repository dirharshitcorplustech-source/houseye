/**
 * HOUSEYE.COM — Tenancy entity
 * Do NOT model only as currentTenantId on Unit.
 * New tenant in same flat = new tenancy record.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type TenancyStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'NOTICE'
  | 'MOVED_OUT'
  | 'CANCELLED';

export interface ITenancy extends Document {
  accountId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  blockId?: mongoose.Types.ObjectId;
  buildingId?: mongoose.Types.ObjectId;
  floorId?: mongoose.Types.ObjectId;
  unitId: mongoose.Types.ObjectId;

  // Primary tenant user (created on move-in)
  primaryTenantUserId?: mongoose.Types.ObjectId;

  // Snapshot / profile fields (also on user)
  fullName: string;
  mobile?: string;
  email?: string;

  status: TenancyStatus;
  startDate: Date;
  endDate?: Date;
  moveInDate?: Date;
  moveOutDate?: Date;

  rent: number; // monthly rent
  securityDeposit?: number;
  securityDepositDate?: Date;
  securityDepositSettled?: boolean;
  securityDepositSettlementAmount?: number;

  // Agreement reference
  agreementDocumentId?: mongoose.Types.ObjectId;

  // Notice
  noticeDate?: Date;
  noticeRemarks?: string;

  // Move-out settlement notes
  moveOutRemarks?: string;

  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TenancySchema = new Schema<ITenancy>(
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
    blockId: { type: Schema.Types.ObjectId, ref: 'Block' },
    buildingId: { type: Schema.Types.ObjectId, ref: 'Building' },
    floorId: { type: Schema.Types.ObjectId, ref: 'Floor' },
    unitId: {
      type: Schema.Types.ObjectId,
      ref: 'Unit',
      required: true,
      index: true,
    },
    primaryTenantUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    fullName: { type: String, required: true, trim: true },
    mobile: String,
    email: { type: String, lowercase: true, trim: true },
    status: {
      type: String,
      enum: ['PENDING', 'ACTIVE', 'NOTICE', 'MOVED_OUT', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    startDate: { type: Date, required: true },
    endDate: Date,
    moveInDate: Date,
    moveOutDate: Date,
    rent: { type: Number, required: true },
    securityDeposit: Number,
    securityDepositDate: Date,
    securityDepositSettled: { type: Boolean, default: false },
    securityDepositSettlementAmount: Number,
    agreementDocumentId: { type: Schema.Types.ObjectId },
    noticeDate: Date,
    noticeRemarks: String,
    moveOutRemarks: String,
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'tenancies',
  }
);

// At most one ACTIVE primary tenancy per unit
TenancySchema.index(
  { unitId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'ACTIVE' },
  }
);

TenancySchema.index({ accountId: 1, status: 1 });
TenancySchema.index({ propertyId: 1, status: 1 });
TenancySchema.index({ primaryTenantUserId: 1 });

const Tenancy: Model<ITenancy> =
  mongoose.models.Tenancy || mongoose.model<ITenancy>('Tenancy', TenancySchema);

export default Tenancy;
