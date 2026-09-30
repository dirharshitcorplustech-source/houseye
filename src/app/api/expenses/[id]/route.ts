import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-session';
import {
  updateExpense,
  softDeleteExpense,
} from '@/services/expenses/update';
import { successResponse, Errors } from '@/lib/utils/response';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();
    const body = await req.json();
    const result = await updateExpense(user, params.id, body);
    if (!result.success) {
      const status =
        result.code === 'FORBIDDEN'
          ? 403
          : result.code === 'NOT_FOUND'
            ? 404
            : 400;
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: result.code, message: result.message },
        }),
        { status, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return successResponse({ expense: result.expense }, 'Expense updated');
  } catch (err) {
    console.error('[Houseye] PATCH expense:', err);
    return Errors.server();
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();
    const result = await softDeleteExpense(user, params.id);
    if (!result.success) {
      const status =
        result.code === 'FORBIDDEN'
          ? 403
          : result.code === 'NOT_FOUND'
            ? 404
            : 400;
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: result.code, message: result.message },
        }),
        { status, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return successResponse(null, 'Expense deleted');
  } catch (err) {
    console.error('[Houseye] DELETE expense:', err);
    return Errors.server();
  }
}
