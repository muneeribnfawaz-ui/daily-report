import { Schema, models, model } from "mongoose";
import { TRANSACTION_TYPES } from "@/lib/constants";

const TransactionSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    financeReportId: { type: Schema.Types.ObjectId, ref: "FinanceReport", default: null, index: true },
    type: { type: String, required: true, enum: TRANSACTION_TYPES },
    particulars: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    amountINR: { type: Number, required: true, default: 0 },
    amountSAR: { type: Number, required: true, default: 0 },
    bankAccountId: { type: Schema.Types.ObjectId, ref: "BankAccount", default: null },
    bankName: { type: String, default: "", trim: true },
    paymentMode: { type: String, default: "", trim: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

TransactionSchema.index({ workspaceId: 1, type: 1 });

if (process.env.NODE_ENV !== "production" && models.Transaction) {
  delete models.Transaction;
}

export default models.Transaction || model("Transaction", TransactionSchema);
