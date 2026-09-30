/**
 * HOUSEYE.COM — Block (optional grouping under Property)
 * e.g. Block A, Block B
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBlock extends Document {
  accountId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  name: string;
  sortOrder: number;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BlockSchema = new Schema<IBlock>(
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
    collection: 'blocks',
  }
);

BlockSchema.index({ propertyId: 1, deletedAt: 1 });
BlockSchema.index({ accountId: 1, propertyId: 1, name: 1 });

const Block: Model<IBlock> =
  mongoose.models.Block || mongoose.model<IBlock>('Block', BlockSchema);

export default Block;
