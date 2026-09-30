/**
 * HOUSEYE.COM — Audit log for high-impact actions
 * Do not over-log harmless UI clicks.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAuditLog extends Document {
  accountId?: mongoose.Types.ObjectId;
  actorUserId?: mongoose.Types.ObjectId;
  actorRole?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', index: true },
    actorUserId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    actorRole: String,
    action: { type: String, required: true, index: true },
    entityType: String,
    entityId: String,
    metadata: Schema.Types.Mixed,
    ipAddress: String,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'audit_logs',
  }
);

AuditLogSchema.index({ accountId: 1, createdAt: -1 });

const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog ||
  mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export default AuditLog;
