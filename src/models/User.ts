/**
 * HOUSEYE.COM — User Model
 * Covers: Super Admin, Owner, Admin, Manager, Tenant
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import { Role, UserStatus } from '@/types';

export interface IUser extends Document {
  accountId?: mongoose.Types.ObjectId; // null for Super Admin
  role: Role;
  username: string;
  email?: string;
  mobile?: string;
  passwordHash: string;

  fullName: string;
  profilePhotoUrl?: string;

  status: UserStatus;

  // Scope (for Admin / Manager)
  // null / empty = full account (Owner) or none
  propertyScopes?: mongoose.Types.ObjectId[];
  // Granular permissions stored as string keys
  permissions?: string[];

  // Invitation
  invitationToken?: string;
  invitationSentAt?: Date;
  invitationAcceptedAt?: Date;

  // Security
  failedLoginAttempts: number;
  lockedUntil?: Date;
  lastLoginAt?: Date;
  passwordChangedAt?: Date;
  previousPasswordHash?: string; // only immediate previous

  // MFA (mandatory for Super Admin)
  mfaEnabled: boolean;
  mfaSecret?: string;
  mfaBackupCodes?: string[];

  // Sessions tracked separately, but we store active session ids optionally
  activeSessionIds?: string[];

  // Soft references
  createdBy?: mongoose.Types.ObjectId;
  suspendedBy?: mongoose.Types.ObjectId;
  suspendedAt?: Date;
  removedAt?: Date;

  // Tenant-specific link (when role === TENANT)
  tenancyId?: mongoose.Types.ObjectId;

  isEmailVerified: boolean;
  isMobileVerified: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      index: true,
    },
    role: {
      type: String,
      enum: ['SUPER_ADMIN', 'OWNER', 'ADMIN', 'MANAGER', 'TENANT'],
      required: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
    },
    mobile: {
      type: String,
      trim: true,
      sparse: true,
    },
    passwordHash: { type: String, required: true, select: false },

    fullName: { type: String, required: true, trim: true },
    profilePhotoUrl: String,

    status: {
      type: String,
      enum: [
        'PENDING_INVITATION',
        'ACTIVE',
        'SUSPENDED',
        'REMOVED',
        'DEACTIVATED',
      ],
      default: 'ACTIVE',
      index: true,
    },

    propertyScopes: [{ type: Schema.Types.ObjectId, ref: 'Property' }],
    permissions: [{ type: String }],

    invitationToken: { type: String, select: false },
    invitationSentAt: Date,
    invitationAcceptedAt: Date,

    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: Date,
    lastLoginAt: Date,
    passwordChangedAt: Date,
    previousPasswordHash: { type: String, select: false },

    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String, select: false },
    mfaBackupCodes: { type: [String], select: false },

    activeSessionIds: [String],

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    suspendedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    suspendedAt: Date,
    removedAt: Date,

    tenancyId: { type: Schema.Types.ObjectId, ref: 'Tenancy' },

    isEmailVerified: { type: Boolean, default: false },
    isMobileVerified: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

// Compound indexes
UserSchema.index({ accountId: 1, role: 1 });
UserSchema.index({ accountId: 1, status: 1 });
UserSchema.index({ email: 1 }, { sparse: true });
UserSchema.index({ mobile: 1 }, { sparse: true });

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
