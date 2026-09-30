/**
 * HOUSEYE.COM — Create expense
 */

import { connectDB } from '@/lib/db/connect';
import { Expense, Property, Account } from '@/models';
import { CurrentUser } from '@/lib/auth/get-session';
import {
  isOwner,
  isSuperAdmin,
  hasPermission,
  hasPropertyScope,
} from '@/services/authorization';
import { PERMISSIONS } from '@/constants/permissions';

export interface CreateExpenseInput {
  propertyId: string;
  amount: number;
  category: string;
  description?: string;
  expenseDate: string;
  attachmentFileName?: string;
}

export async function createExpense(
  actor: CurrentUser,
  input: CreateExpenseInput
): Promise<
  | { success: true; expense: Record<string, unknown> }
  | { success: false; code: string; message: string }
> {
  const canCreate =
    isOwner(actor) ||
    isSuperAdmin(actor) ||
    hasPermission(actor, PERMISSIONS.EXPENSE_CREATE);

  if (!canCreate) {
    return {
      success: false,
      code: 'FORBIDDEN',
      message: "You don't have permission to create expenses",
    };
  }

  if (!input.amount || input.amount <= 0) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Valid amount is required',
    };
  }

  if (!input.category?.trim()) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Category is required',
    };
  }

  await connectDB();

  const property = await Property.findOne({
    _id: input.propertyId,
    deletedAt: null,
  }).exec();

  if (!property) {
    return { success: false, code: 'NOT_FOUND', message: 'Property not found' };
  }

  if (
    !isSuperAdmin(actor) &&
    property.accountId.toString() !== actor.accountId
  ) {
    return { success: false, code: 'FORBIDDEN', message: 'Access denied' };
  }

  if (!isOwner(actor) && !isSuperAdmin(actor)) {
    const scope = hasPropertyScope(actor, input.propertyId);
    if (!scope.allowed) {
      return { success: false, code: scope.code, message: scope.message };
    }
  }

  const account = await Account.findById(property.accountId)
    .select('subscriptionStatus')
    .exec();

  if (!account || account.subscriptionStatus !== 'ACTIVE') {
    return {
      success: false,
      code: 'SUBSCRIPTION_INACTIVE',
      message: 'New expenses are blocked while subscription is inactive.',
    };
  }

  const expense = await Expense.create({
    accountId: property.accountId,
    propertyId: input.propertyId,
    amount: input.amount,
    category: input.category.trim(),
    description: input.description?.trim(),
    expenseDate: new Date(input.expenseDate),
    attachmentFileName: input.attachmentFileName,
    createdBy: actor.id,
  });

  return {
    success: true,
    expense: {
      id: expense._id.toString(),
      amount: expense.amount,
      category: expense.category,
      expenseDate: expense.expenseDate,
      propertyId: expense.propertyId.toString(),
    },
  };
}
