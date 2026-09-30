import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-session';
import { createExpense } from '@/services/expenses/create';
import { connectDB } from '@/lib/db/connect';
import { Expense } from '@/models';
import { successResponse, Errors } from '@/lib/utils/response';
import { isSuperAdmin } from '@/services/authorization';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();
    if (user.role === 'TENANT') return Errors.forbidden();

    await connectDB();
    const filter: Record<string, unknown> = { deletedAt: null };
    if (!isSuperAdmin(user)) {
      filter.accountId = user.accountId;
      if (user.role === 'MANAGER' && user.propertyScopes?.length) {
        filter.propertyId = { $in: user.propertyScopes };
      }
    }

    const propertyId = req.nextUrl.searchParams.get('propertyId');
    if (propertyId) filter.propertyId = propertyId;

    const expenses = await Expense.find(filter)
      .sort({ expenseDate: -1 })
      .limit(50)
      .lean();

    return successResponse({
      expenses: expenses.map((e) => ({
        id: e._id.toString(),
        amount: e.amount,
        category: e.category,
        description: e.description,
        expenseDate: e.expenseDate,
        propertyId: e.propertyId.toString(),
        attachmentFileName: e.attachmentFileName,
      })),
    });
  } catch (err) {
    console.error('[Houseye] GET expenses:', err);
    return Errors.server();
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();

    const body = await req.json();
    const result = await createExpense(user, {
      propertyId: body.propertyId,
      amount: body.amount,
      category: body.category,
      description: body.description,
      expenseDate: body.expenseDate || new Date().toISOString(),
      attachmentFileName: body.attachmentFileName,
    });

    if (!result.success) {
      const statusMap: Record<string, number> = {
        FORBIDDEN: 403,
        VALIDATION_ERROR: 422,
        NOT_FOUND: 404,
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

    return successResponse({ expense: result.expense }, 'Expense recorded', 201);
  } catch (err) {
    console.error('[Houseye] POST expenses:', err);
    return Errors.server();
  }
}
