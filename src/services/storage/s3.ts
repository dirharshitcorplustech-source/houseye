/**
 * HOUSEYE.COM — Private S3 storage
 * Presigned PUT/GET. Objects are never public-read.
 */

import { isProductionLike } from '@/lib/config/env';

export function isS3Configured(): boolean {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_S3_BUCKET
  );
}

function bucket() {
  return process.env.AWS_S3_BUCKET!;
}

function region() {
  return process.env.AWS_REGION || 'ap-south-1';
}

export async function createPresignedUpload(input: {
  key: string;
  contentType: string;
  expiresIn?: number;
}): Promise<
  | { success: true; url: string; key: string }
  | { success: false; message: string }
> {
  if (!isS3Configured()) {
    if (!isProductionLike()) {
      // Dev stub URL
      return {
        success: true,
        url: `http://localhost:3000/api/dev/upload-stub?key=${encodeURIComponent(input.key)}`,
        key: input.key,
      };
    }
    return { success: false, message: 'S3 is not configured' };
  }

  try {
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

    const client = new S3Client({
      region: region(),
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    const command = new PutObjectCommand({
      Bucket: bucket(),
      Key: input.key,
      ContentType: input.contentType,
      ServerSideEncryption: 'AES256',
    });

    const url = await getSignedUrl(client, command, {
      expiresIn: input.expiresIn || 900,
    });

    return { success: true, url, key: input.key };
  } catch (err) {
    console.error('[Houseye] S3 presign upload', err);
    return { success: false, message: 'Failed to create upload URL' };
  }
}

export async function createPresignedDownload(input: {
  key: string;
  expiresIn?: number;
}): Promise<
  | { success: true; url: string }
  | { success: false; message: string }
> {
  if (!isS3Configured()) {
    if (!isProductionLike()) {
      return {
        success: true,
        url: `http://localhost:3000/api/dev/download-stub?key=${encodeURIComponent(input.key)}`,
      };
    }
    return { success: false, message: 'S3 is not configured' };
  }

  try {
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

    const client = new S3Client({
      region: region(),
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    const command = new GetObjectCommand({
      Bucket: bucket(),
      Key: input.key,
    });

    const url = await getSignedUrl(client, command, {
      expiresIn: input.expiresIn || 900,
    });

    return { success: true, url };
  } catch (err) {
    console.error('[Houseye] S3 presign download', err);
    return { success: false, message: 'Failed to create download URL' };
  }
}

/** Build tenant-isolated object key */
export function buildObjectKey(parts: {
  accountId: string;
  category: string;
  fileName: string;
}): string {
  const safe = parts.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const ts = Date.now();
  return `accounts/${parts.accountId}/${parts.category}/${ts}-${safe}`;
}
