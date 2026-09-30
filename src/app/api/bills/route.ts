/**
 * HOUSEYE.COM — Bills API
 * POST — generate bill
 * GET  — list bills
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-session';
import { generateBill } from '@/services/billing/generate-bill';
import { connectDB } from '@/lib/db/connect';
import { Bill } from '@/models';
import { successResponse, Errors } from '@/lib/utils/response';
import { isSuperAdmin } from '@/services/authorization';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();

    await connectDB();

    const filter: Record<string, unknown> = {};

    if (user.role === 'TENANT') {
      filter.tenantUserId = user.id;
    } else if (!isSuperAdmin(user)) {
      filter.accountId = user.accountId;
      if (user.role === 'MANAGER' && user.propertyScopes?.length) {
        filter.propertyId = { $in: user.propertyScopes };
      }
    }

    const status = req.nextUrl.searchParams.get('status');
    if (status) filter.status = status;

    const bills = await Bill.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return successResponse({
      bills: bills.map((b) => ({
        id: b._id.toString(),
        billNumber: b.billNumber,
        totalAmount: b.totalAmount,
        totalPaid: b.totalPaid,
        totalRemaining: b.totalRemaining,
        status: b.status,
        dueDate: b.dueDate,
        snapshot: b.snapshot,
        createdAt: b.createdAt,
      })),
    });
  } catch (err) {
    console.error('[Houseye] GET bills:', err);
    return Errors.server();
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();

    const body = await req.json();
    const result = await generateBill(user, {
      tenancyId: body.tenancyId,
      billingPeriodStart: body.billingPeriodStart,
      billingPeriodEnd: body.billingPeriodEnd,
      dueDate: body.dueDate,
      electricityAmount: body.electricityAmount,
      waterAmount: body.waterAmount,
      fineAmount: body.fineAmount,
      previousDue: body.previousDue,
      maintenanceAmount: body.maintenanceAmount,
      maintenanceRecovery: body.maintenanceRecovery,
      notes: body.notes,
    });

    if (!result.success) {
      const statusMap: Record<string, number> = {
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        CONFLICT: 409,
        SUBSCRIPTION_INACTIVE: 403,
        SUBSCRIPTION_REQUIRED: 403,
      };
      const status = statusMap[result.code] || 400;
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: result.code, message: result.message },
        }),
        { status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return successResponse({ bill: result.bill }, 'Bill generated', 201);
  } catch (err) {
    console.error('[Houseye] POST bills:', err);
    return Errors.server();
  }
}
