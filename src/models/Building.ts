/**
 * HOUSEYE.COM — Building (optional under Property or Block)
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBuilding extends Document {
  accountId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  blockId?: mongoose.Types.ObjectId;
  name: string;
  sortOrder: number;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BuildingSchema = new Schema<IBuilding>(
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
    blockId: { type: Schema.Types.ObjectId, ref: 'Block', index: true },
    name: { type: String, required: true, trim: true },
    sortOrder: { type: Number, default: 0 },
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
    collection: 'buildings',
  }
);

BuildingSchema.index({ propertyId: 1, deletedAt: 1 });
BuildingSchema.index({ accountId: 1, propertyId: 1 });

const Building: Model<IBuilding> =
  mongoose.models.Building ||
  mongoose.model<IBuilding>('Building', BuildingSchema);

export default Building;
