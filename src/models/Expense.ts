/**
 * HOUSEYE.COM — Property expense
 * Max one attachment. Blocked when subscription expired.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IExpense extends Document {
  accountId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  amount: number;
  category: string;
  description?: string;
  expenseDate: Date;
  attachmentFileName?: string;
  attachmentKey?: string;
  createdBy: mongoose.Types.ObjectId;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true },
    description: String,
    expenseDate: { type: Date, required: true },
    attachmentFileName: String,
    attachmentKey: String,
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    deletedAt: Date,
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'expenses',
  }
);

ExpenseSchema.index({ accountId: 1, expenseDate: -1 });
ExpenseSchema.index({ propertyId: 1, deletedAt: 1 });

const Expense: Model<IExpense> =
  mongoose.models.Expense || mongoose.model<IExpense>('Expense', ExpenseSchema);

export default Expense;
