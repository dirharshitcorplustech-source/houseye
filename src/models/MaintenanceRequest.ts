/**
 * HOUSEYE.COM — Maintenance / Complaint
 * No Delete — lifecycle ends at Closed.
 * Tenant: max one photo, no manual priority.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type MaintenanceStatus =
  | 'SUBMITTED'
  | 'ACKNOWLEDGED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED';

export type CostResponsibility = 'OWNER' | 'TENANT' | 'SPLIT';

export const MAINTENANCE_CATEGORIES = [
  'Plumbing',
  'Electricity',
  'Water Supply',
  'Leakage/Dampness',
  'Bathroom',
  'Kitchen',
  'Door/Lock',
  'Window',
  'AC/Fan',
  'Lift',
  'Cleaning',
  'Pest Control',
  'Internet/Intercom',
  'Security',
  'Common Area',
  'Parking',
  'Appliance',
  'Furniture',
  'Other',
] as const;

export type MaintenanceCategory = (typeof MAINTENANCE_CATEGORIES)[number];

export interface IMaintenanceRequest extends Document {
  accountId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  unitId: mongoose.Types.ObjectId;
  tenancyId?: mongoose.Types.ObjectId;
  tenantUserId?: mongoose.Types.ObjectId;

  category: string;
  description: string;
  photoKey?: string;
  photoFileName?: string;

  // System-determined priority
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

  status: MaintenanceStatus;
  statusHistory: Array<{
    status: MaintenanceStatus;
    at: Date;
    by?: mongoose.Types.ObjectId;
    note?: string;
  }>;

  costResponsibility?: CostResponsibility;
  ownerCost?: number;
  tenantCost?: number;
  finalCost?: number;
  costDecidedAt?: Date;

  // One dispute only
  disputed: boolean;
  disputeReason?: string;
  disputeResolved: boolean;
  disputeResolutionNote?: string;

  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MaintenanceRequestSchema = new Schema<IMaintenanceRequest>(
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
    tenantUserId: { type: Schema.Types.ObjectId, ref: 'User' },

    category: { type: String, required: true },
    description: { type: String, required: true, trim: true },
    photoKey: String,
    photoFileName: String,

    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM',
    },

    status: {
      type: String,
      enum: [
        'SUBMITTED',
        'ACKNOWLEDGED',
        'IN_PROGRESS',
        'RESOLVED',
        'CLOSED',
      ],
      default: 'SUBMITTED',
      index: true,
    },
    statusHistory: [
      {
        status: String,
        at: Date,
        by: { type: Schema.Types.ObjectId, ref: 'User' },
        note: String,
      },
    ],

    costResponsibility: {
      type: String,
      enum: ['OWNER', 'TENANT', 'SPLIT'],
    },
    ownerCost: Number,
    tenantCost: Number,
    finalCost: Number,
    costDecidedAt: Date,

    disputed: { type: Boolean, default: false },
    disputeReason: String,
    disputeResolved: { type: Boolean, default: false },
    disputeResolutionNote: String,

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'maintenance_requests',
  }
);

MaintenanceRequestSchema.index({ accountId: 1, status: 1 });
MaintenanceRequestSchema.index({ tenantUserId: 1, createdAt: -1 });

const MaintenanceRequest: Model<IMaintenanceRequest> =
  mongoose.models.MaintenanceRequest ||
  mongoose.model<IMaintenanceRequest>(
    'MaintenanceRequest',
    MaintenanceRequestSchema
  );

export default MaintenanceRequest;

/** System priority from category */
export function determinePriority(
  category: string
): 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' {
  const urgent = ['Electricity', 'Water Supply', 'Leakage/Dampness', 'Security', 'Door/Lock'];
  const high = ['Plumbing', 'Lift', 'Gas'];
  if (urgent.some((c) => category.includes(c))) return 'URGENT';
  if (high.some((c) => category.includes(c))) return 'HIGH';
  if (['Cleaning', 'Pest Control', 'Furniture'].includes(category)) return 'LOW';
  return 'MEDIUM';
}
