/**
 * HOUSEYE.COM — Floor
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFloor extends Document {
  accountId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  blockId?: mongoose.Types.ObjectId;
  buildingId?: mongoose.Types.ObjectId;
  name: string; // e.g. "Ground", "1", "2"
  sortOrder: number;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FloorSchema = new Schema<IFloor>(
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
    collection: 'floors',
  }
);

FloorSchema.index({ propertyId: 1, deletedAt: 1 });
FloorSchema.index({ accountId: 1, propertyId: 1 });

const Floor: Model<IFloor> =
  mongoose.models.Floor || mongoose.model<IFloor>('Floor', FloorSchema);

export default Floor;
