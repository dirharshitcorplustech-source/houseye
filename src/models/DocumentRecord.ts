/**
 * HOUSEYE.COM — Document metadata (agreements, IDs, receipts)
 * Binary storage = S3 later. Max policy enforced at upload layer.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type DocumentCategory =
  | 'AGREEMENT'
  | 'ID_PROOF'
  | 'RECEIPT'
  | 'INVOICE'
  | 'OTHER';

export interface IDocumentRecord extends Document {
  accountId: mongoose.Types.ObjectId;
  propertyId?: mongoose.Types.ObjectId;
  unitId?: mongoose.Types.ObjectId;
  tenancyId?: mongoose.Types.ObjectId;
  tenantUserId?: mongoose.Types.ObjectId;
  category: DocumentCategory;
  title: string;
  fileName: string;
  fileKey?: string; // S3 key
  mimeType?: string;
  sizeBytes?: number;
  uploadedBy: mongoose.Types.ObjectId;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentRecordSchema = new Schema<IDocumentRecord>(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },
    propertyId: { type: Schema.Types.ObjectId, ref: 'Property' },
    unitId: { type: Schema.Types.ObjectId, ref: 'Unit' },
    tenancyId: { type: Schema.Types.ObjectId, ref: 'Tenancy', index: true },
    tenantUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    category: {
      type: String,
      enum: ['AGREEMENT', 'ID_PROOF', 'RECEIPT', 'INVOICE', 'OTHER'],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    fileName: { type: String, required: true },
    fileKey: String,
    mimeType: String,
    sizeBytes: Number,
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    deletedAt: Date,
  },
  {
    timestamps: true,
    collection: 'documents',
  }
);

const DocumentRecord: Model<IDocumentRecord> =
  mongoose.models.DocumentRecord ||
  mongoose.model<IDocumentRecord>('DocumentRecord', DocumentRecordSchema);

export default DocumentRecord;
