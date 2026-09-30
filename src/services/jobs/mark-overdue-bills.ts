/**
 * HOUSEYE.COM — Mark ISSUED/PARTIALLY_PAID bills as OVERDUE past due date
 */

import { connectDB } from '@/lib/db/connect';
import { Bill } from '@/models';

export async function markOverdueBills(limit = 200): Promise<{
  updated: number;
}> {
  await connectDB();
  const now = new Date();

  const result = await Bill.updateMany(
    {
      status: { $in: ['ISSUED', 'PARTIALLY_PAID'] },
      dueDate: { $lt: now },
      totalRemaining: { $gt: 0 },
    },
    {
      $set: { status: 'OVERDUE' },
    }
  );

  return { updated: result.modifiedCount || 0 };
}
