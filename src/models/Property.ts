/**
 * HOUSEYE.COM — Property Model
 * Top-level structure entity. Only Owner can create/edit/delete structure.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type PropertyType = 'RESIDENTIAL' | 'COMMERCIAL' | 'MIXED_USE';

export interface IProperty extends Document {
  accountId: mongoose.Types.ObjectId;
  name: string;
  propertyType: PropertyType;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pin?: string;
    country?: string;
  };
  // Billing defaults at property level
  billingSettings?: {
    billingDay?: number; // 1-28
    previousMonthEnd?: boolean;
    defaultRent?: number; // stored as integer paise later; for now number
    electricityRate?: number;
    fineAmount?: number;
    fineType?: 'FIXED' | 'PERCENT';
    paymentInstructions?: string;
    upiId?: string;
    bankAccount?: string;
    bankAccountName?: string;
    bankName?: string;
    ifsc?: string;
  };
  notes?: string;
  isArchived: boolean; // soft structure archive
  deletedAt?: Date; // Trash
  deletedBy?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PropertySchema = new Schema<IProperty>(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    propertyType: {
      type: String,
      enum: ['RESIDENTIAL', 'COMMERCIAL', 'MIXED_USE'],
      required: true,
    },
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      pin: String,
      country: { type: String, default: 'IN' },
    },
    billingSettings: {
      billingDay: { type: Number, min: 1, max: 28 },
      previousMonthEnd: { type: Boolean, default: false },
      defaultRent: Number,
      electricityRate: Number,
      fineAmount: Number,
      fineType: { type: String, enum: ['FIXED', 'PERCENT'] },
      paymentInstructions: String,
      upiId: String,
      bankAccount: String,
      bankAccountName: String,
      bankName: String,
      ifsc: String,
    },
    notes: String,
    isArchived: { type: Boolean, default: false },
    deletedAt: Date,
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'properties',
  }
);

PropertySchema.index({ accountId: 1, deletedAt: 1 });
PropertySchema.index({ accountId: 1, name: 1 });

const Property: Model<IProperty> =
  mongoose.models.Property ||
  mongoose.model<IProperty>('Property', PropertySchema);

export default Property;
