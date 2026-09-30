/**
 * HOUSEYE.COM — Update / soft-delete expense
 */

import { connectDB } from '@/lib/db/connect';
import { Expense, Account } from '@/models';
import { CurrentUser } from '@/lib/auth/get-session';
import {
  isOwner,
  isSuperAdmin,
  hasPermission,
  hasPropertyScope,
} from '@/services/authorization';
import { PERMISSIONS } from '@/constants/permissions';

export async function updateExpense(
  actor: CurrentUser,
  expenseId: string,
  input: {
    amount?: number;
    category?: string;
    description?: string;
    expenseDate?: string;
  }
): Promise<
  | { success: true; expense: Record<string, unknown> }
  | { success: false; code: string; message: string }
> {
  const can =
    isOwner(actor) ||
    isSuperAdmin(actor) ||
    hasPermission(actor, PERMISSIONS.EXPENSE_EDIT);

  if (!can) {
    return {
      success: false,
      code: 'FORBIDDEN',
      message: "You don't have permission to edit expenses",
    };
  }

  await connectDB();
  const expense = await Expense.findOne({
    _id: expenseId,
    deletedAt: null,
  }).exec();

  if (!expense) {
    return { success: false, code: 'NOT_FOUND', message: 'Expense not found' };
  }

  if (
    !isSuperAdmin(actor) &&
    expense.accountId.toString() !== actor.accountId
  ) {
    return { success: false, code: 'FORBIDDEN', message: 'Access denied' };
  }

  if (!isOwner(actor) && !isSuperAdmin(actor)) {
    const scope = hasPropertyScope(actor, expense.propertyId.toString());
    if (!scope.allowed) {
      return { success: false, code: scope.code, message: scope.message };
    }
  }

  const account = await Account.findById(expense.accountId)
    .select('subscriptionStatus')
    .exec();
  if (!account || account.subscriptionStatus !== 'ACTIVE') {
    return {
      success: false,
      code: 'SUBSCRIPTION_INACTIVE',
      message: 'Cannot edit expenses while subscription is inactive',
    };
  }

  if (input.amount != null) {
    if (input.amount <= 0) {
      return {
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Amount must be positive',
      };
    }
    expense.amount = input.amount;
  }
  if (input.category?.trim()) expense.category = input.category.trim();
  if (input.description !== undefined) expense.description = input.description;
  if (input.expenseDate) expense.expenseDate = new Date(input.expenseDate);

  await expense.save();

  return {
    success: true,
    expense: {
      id: expense._id.toString(),
      amount: expense.amount,
      category: expense.category,
      description: expense.description,
      expenseDate: expense.expenseDate,
    },
  };
}

export async function softDeleteExpense(
  actor: CurrentUser,
  expenseId: string
): Promise<
  | { success: true }
  | { success: false; code: string; message: string }
> {
  const can =
    isOwner(actor) ||
    isSuperAdmin(actor) ||
    hasPermission(actor, PERMISSIONS.EXPENSE_EDIT);

  if (!can) {
    return {
      success: false,
      code: 'FORBIDDEN',
      message: "You don't have permission to delete expenses",
    };
  }

  await connectDB();
  const expense = await Expense.findOne({
    _id: expenseId,
    deletedAt: null,
  }).exec();

  if (!expense) {
    return { success: false, code: 'NOT_FOUND', message: 'Expense not found' };
  }

  if (
    !isSuperAdmin(actor) &&
    expense.accountId.toString() !== actor.accountId
  ) {
    return { success: false, code: 'FORBIDDEN', message: 'Access denied' };
  }

  expense.deletedAt = new Date();
  await expense.save();
  return { success: true };
}
