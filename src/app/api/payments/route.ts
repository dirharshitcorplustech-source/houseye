/**
 * HOUSEYE.COM — Payments API
 * POST — submit payment
 * GET  — list payments
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-session';
import { submitPayment } from '@/services/billing/submit-payment';
import { connectDB } from '@/lib/db/connect';
import { Payment } from '@/models';
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
    }

    const status = req.nextUrl.searchParams.get('status');
    if (status) filter.status = status;

    const billId = req.nextUrl.searchParams.get('billId');
    if (billId) filter.billId = billId;

    const payments = await Payment.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return successResponse({
      payments: payments.map((p) => ({
        id: p._id.toString(),
        billId: p.billId.toString(),
        amount: p.amount,
        status: p.status,
        method: p.method,
        rejectionReason: p.rejectionReason,
        receiptNumber: p.receiptNumber,
        createdAt: p.createdAt,
        reviewedAt: p.reviewedAt,
      })),
    });
  } catch (err) {
    console.error('[Houseye] GET payments:', err);
    return Errors.server();
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();

    const body = await req.json();
    const result = await submitPayment(user, {
      billId: body.billId,
      amount: body.amount,
      method: body.method,
      transactionRef: body.transactionRef,
      paymentDate: body.paymentDate,
      note: body.note,
      proofFileName: body.proofFileName,
    });

    if (!result.success) {
      const statusMap: Record<string, number> = {
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        CONFLICT: 409,
        VALIDATION_ERROR: 422,
        SUBSCRIPTION_INACTIVE: 403,
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

    return successResponse(
      { payment: result.payment },
      'Payment submitted for review',
      201
    );
  } catch (err) {
    console.error('[Houseye] POST payments:', err);
    return Errors.server();
  }
}
