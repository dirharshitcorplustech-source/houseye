/**
 * HOUSEYE.COM — Super Admin / cron: finalize accounts past 30-day wait
 * Protect with CRON_SECRET or Super Admin session.
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-session';
import { connectDB } from '@/lib/db/connect';
import { Account } from '@/models';
import {
  finalizeAccountDeletion,
  WAITING_DAYS,
} from '@/services/account/deletion';
import { successResponse, Errors } from '@/lib/utils/response';

export async function POST(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const headerSecret = req.headers.get('x-cron-secret');
    const user = await getCurrentUser();

    const authorized =
      (cronSecret && headerSecret === cronSecret) ||
      (user && user.isSuperAdmin);

    if (!authorized) {
      return Errors.forbidden();
    }

    await connectDB();

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - WAITING_DAYS);

    const pending = await Account.find({
      deletionRequestedAt: { $lte: cutoff, $ne: null },
      deactivatedAt: null,
    })
      .select('_id')
      .limit(50)
      .lean();

    const results: Array<{ accountId: string; ok: boolean; message?: string }> =
      [];

    for (const a of pending) {
      const id = a._id.toString();
      const result = await finalizeAccountDeletion(id);
      results.push({
        accountId: id,
        ok: result.success,
        message: result.success ? undefined : result.message,
      });
    }

    return successResponse({
      processed: results.length,
      results,
    });
  } catch (err) {
    console.error('[Houseye] finalize-deletions:', err);
    return Errors.server();
  }
}
