/**
 * HOUSEYE.COM — Family members / occupants
 * Do NOT consume Primary Tenant subscription capacity
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOccupant extends Document {
  accountId: mongoose.Types.ObjectId;
  tenancyId: mongoose.Types.ObjectId;
  unitId: mongoose.Types.ObjectId;
  fullName: string;
  relation?: string;
  mobile?: string;
  age?: number;
  isEmergencyContact: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OccupantSchema = new Schema<IOccupant>(
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
      index: true,
    },
    unitId: {
      type: Schema.Types.ObjectId,
      ref: 'Unit',
      required: true,
    },
    fullName: { type: String, required: true, trim: true },
    relation: String,
    mobile: String,
    age: Number,
    isEmergencyContact: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'occupants',
  }
);

const Occupant: Model<IOccupant> =
  mongoose.models.Occupant ||
  mongoose.model<IOccupant>('Occupant', OccupantSchema);

export default Occupant;
