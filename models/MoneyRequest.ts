import { Schema, models, model } from "mongoose";

const BankBalanceSchema = new Schema(
  {
    bankName: { type: String, required: true },
    openingBalance: { type: Number, required: true, default: 0 },
    receipts: { type: Number, required: true, default: 0 },
    payments: { type: Number, required: true, default: 0 },
    closingBalance: { type: Number, required: true, default: 0 }
  },
  { _id: false }
);

const MoneyRequestSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    submittedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    submittedByName: { type: String, required: true },
    reportDate: { type: Date, required: true },
    particulars: { type: String, required: true },
    description: { type: String, default: "" },
    amountINR: { type: Number, required: true, default: 0 },
    amountSAR: { type: Number, required: true, default: 0 },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium"
    },
    bankName: { type: String, default: "" },
    bankBalances: { type: [BankBalanceSchema], default: [] },
    revisedAmountINR: { type: Number, default: null },
    revisedAmountSAR: { type: Number, default: null },
    revisionReference: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    financeReportId: { type: Schema.Types.ObjectId, ref: "FinanceReport", default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewedByName: { type: String, default: "" },
    reviewedAt: { type: Date, default: null },
    reviewComment: { type: String, default: "" }
  },
  { timestamps: true }
);

MoneyRequestSchema.index({ workspaceId: 1, reportDate: -1 });
MoneyRequestSchema.index({ status: 1 });
MoneyRequestSchema.index({ submittedBy: 1 });

if (process.env.NODE_ENV !== "production" && models.MoneyRequest) {
  delete models.MoneyRequest;
}

export default models.MoneyRequest || model("MoneyRequest", MoneyRequestSchema);
