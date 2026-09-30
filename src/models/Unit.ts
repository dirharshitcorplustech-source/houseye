/**
 * HOUSEYE.COM — Unit (Flat / Shop / Office / Custom)
 * Counts toward subscription unit capacity
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type UnitType = 'FLAT' | 'SHOP' | 'OFFICE' | 'OTHER' | string;
export type VacancyStatus = 'OCCUPIED' | 'VACANT';
export type Furnishing = 'UNFURNISHED' | 'SEMI_FURNISHED' | 'FULLY_FURNISHED';

export interface IUnit extends Document {
  accountId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  blockId?: mongoose.Types.ObjectId;
  buildingId?: mongoose.Types.ObjectId;
  floorId?: mongoose.Types.ObjectId;

  unitNumber: string;
  unitType: UnitType;
  customUnitType?: string;

  // Physical profile
  bedrooms?: number;
  livingRooms?: number;
  kitchens?: number;
  bathrooms?: number;
  balconies?: number;
  otherRooms?: number;
  areaSqft?: number;
  furnishing?: Furnishing;
  inventoryNotes?: string;

  // Status
  vacancyStatus: VacancyStatus;
  vacancyStartDate?: Date;
  currentResidentCount: number;

  // Overrides
  rentOverride?: number;
  electricityRateOverride?: number;

  // Electricity / meter reference (Phase 4 expands)
  meterNumber?: string;

  notes?: string;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const UnitSchema = new Schema<IUnit>(
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
    floorId: { type: Schema.Types.ObjectId, ref: 'Floor', index: true },

    unitNumber: { type: String, required: true, trim: true },
    unitType: { type: String, required: true, default: 'FLAT' },
    customUnitType: String,

    bedrooms: Number,
    livingRooms: Number,
    kitchens: Number,
    bathrooms: Number,
    balconies: Number,
    otherRooms: Number,
    areaSqft: Number,
    furnishing: {
      type: String,
      enum: ['UNFURNISHED', 'SEMI_FURNISHED', 'FULLY_FURNISHED'],
    },
    inventoryNotes: String,

    vacancyStatus: {
      type: String,
      enum: ['OCCUPIED', 'VACANT'],
      default: 'VACANT',
      index: true,
    },
    vacancyStartDate: Date,
    currentResidentCount: { type: Number, default: 0 },

    rentOverride: Number,
    electricityRateOverride: Number,
    meterNumber: String,
    notes: String,

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
    collection: 'units',
  }
);

// Unit number unique within property (active records)
UnitSchema.index(
  { propertyId: 1, unitNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null },
  }
);
UnitSchema.index({ accountId: 1, deletedAt: 1 });
UnitSchema.index({ propertyId: 1, vacancyStatus: 1, deletedAt: 1 });

const Unit: Model<IUnit> =
  mongoose.models.Unit || mongoose.model<IUnit>('Unit', UnitSchema);

export default Unit;
