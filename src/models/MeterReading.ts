/**
 * HOUSEYE.COM — Electricity / meter readings
 * Corrections may recalculate affected bills (controlled).
 * Blocked when subscription expired.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMeterReading extends Document {
  accountId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  unitId: mongoose.Types.ObjectId;
  tenancyId?: mongoose.Types.ObjectId;
  reading: number;
  previousReading?: number;
  unitsConsumed?: number;
  readingDate: Date;
  notes?: string;
  isCorrection: boolean;
  correctedFromId?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MeterReadingSchema = new Schema<IMeterReading>(
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
    tenancyId: { type: Schema.Types.ObjectId, ref: 'Tenancy' },
    reading: { type: Number, required: true, min: 0 },
    previousReading: Number,
    unitsConsumed: Number,
    readingDate: { type: Date, required: true },
    notes: String,
    isCorrection: { type: Boolean, default: false },
    correctedFromId: { type: Schema.Types.ObjectId, ref: 'MeterReading' },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'meter_readings',
  }
);

MeterReadingSchema.index({ unitId: 1, readingDate: -1 });

const MeterReading: Model<IMeterReading> =
  mongoose.models.MeterReading ||
  mongoose.model<IMeterReading>('MeterReading', MeterReadingSchema);

export default MeterReading;
