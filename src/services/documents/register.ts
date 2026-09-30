/**
 * HOUSEYE.COM — Register document metadata
 * Actual file upload to S3 is Phase later; this stores the record.
 */

import { connectDB } from '@/lib/db/connect';
import { DocumentRecord, Account } from '@/models';
import { CurrentUser } from '@/lib/auth/get-session';
import {
  isOwner,
  isSuperAdmin,
  hasPermission,
} from '@/services/authorization';
import { PERMISSIONS } from '@/constants/permissions';
import { getEffectiveLimits, getUsage } from '@/services/entitlement';

export interface RegisterDocumentInput {
  title: string;
  fileName: string;
  category: 'AGREEMENT' | 'ID_PROOF' | 'RECEIPT' | 'INVOICE' | 'OTHER';
  propertyId?: string;
  unitId?: string;
  tenancyId?: string;
  tenantUserId?: string;
  mimeType?: string;
  sizeBytes?: number;
  fileKey?: string;
}

export async function registerDocument(
  actor: CurrentUser,
  input: RegisterDocumentInput
): Promise<
  | { success: true; document: Record<string, unknown> }
  | { success: false; code: string; message: string }
> {
  const can =
    isOwner(actor) ||
    isSuperAdmin(actor) ||
    hasPermission(actor, PERMISSIONS.DOCUMENT_UPLOAD) ||
    actor.role === 'TENANT';

  if (!can) {
    return {
      success: false,
      code: 'FORBIDDEN',
      message: "You don't have permission to upload documents",
    };
  }

  if (!input.title?.trim() || !input.fileName?.trim()) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Title and file name are required',
    };
  }

  if (!actor.accountId && actor.role !== 'TENANT' && !isSuperAdmin(actor)) {
    return { success: false, code: 'FORBIDDEN', message: 'No account context' };
  }

  await connectDB();

  // Tenant: resolve account from context later; for staff use actor.accountId
  let accountId = actor.accountId;

  if (actor.role === 'TENANT') {
    // Tenants upload under their tenancy's account — require tenancyId
    if (!input.tenancyId) {
      return {
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'tenancyId is required for tenant uploads',
      };
    }
    const { Tenancy } = await import('@/models');
    const tenancy = await Tenancy.findById(input.tenancyId).exec();
    if (!tenancy || tenancy.primaryTenantUserId?.toString() !== actor.id) {
      return { success: false, code: 'FORBIDDEN', message: 'Access denied' };
    }
    accountId = tenancy.accountId.toString();
  }

  if (!accountId) {
    return { success: false, code: 'FORBIDDEN', message: 'No account context' };
  }

  const account = await Account.findById(accountId)
    .select('subscriptionStatus')
    .exec();
  if (!account || account.subscriptionStatus !== 'ACTIVE') {
    return {
      success: false,
      code: 'SUBSCRIPTION_INACTIVE',
      message: 'Document uploads are blocked while subscription is inactive.',
    };
  }

  // Storage quota: plan storageGB vs usage.storageBytes
  if (input.sizeBytes && input.sizeBytes > 0) {
    const limits = await getEffectiveLimits(accountId);
    const usage = await getUsage(accountId);
    if (limits && usage) {
      const limitBytes = (limits.storageGB || 0) * 1024 * 1024 * 1024;
      if (usage.storageBytes + input.sizeBytes > limitBytes) {
        return {
          success: false,
          code: 'RESOURCE_LIMIT',
          message: `Storage limit reached (${limits.storageGB} GB). Free space or upgrade.`,
        };
      }
    }
  }

  const doc = await DocumentRecord.create({
    accountId,
    propertyId: input.propertyId,
    unitId: input.unitId,
    tenancyId: input.tenancyId,
    tenantUserId: input.tenantUserId || (actor.role === 'TENANT' ? actor.id : undefined),
    category: input.category,
    title: input.title.trim(),
    fileName: input.fileName.trim(),
    fileKey: input.fileKey,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    uploadedBy: actor.id,
  });

  if (input.sizeBytes && input.sizeBytes > 0) {
    await Account.updateOne(
      { _id: accountId },
      { $inc: { 'usage.storageBytes': input.sizeBytes } }
    );
  }

  return {
    success: true,
    document: {
      id: doc._id.toString(),
      title: doc.title,
      category: doc.category,
      fileName: doc.fileName,
      createdAt: doc.createdAt,
    },
  };
}
