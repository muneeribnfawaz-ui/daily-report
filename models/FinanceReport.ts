import { Schema, models, model } from "mongoose";

const FinanceItemSchema = new Schema({
  particulars: { type: String, required: true },
  description: { type: String, default: "" },
  amountINR: { type: Number, required: true, default: 0 },
  amountSAR: { type: Number, required: true, default: 0 },
  priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
  bankName: { type: String, default: "" },
  revisedAmountINR: { type: Number, default: null },
  revisedAmountSAR: { type: Number, default: null },
  revisionReference: { type: String, default: "" },
  approval: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" }
}, { _id: true });

const BankBalanceSchema = new Schema({
  bankName: { type: String, required: true },
  openingBalance: { type: Number, required: true, default: 0 },
  receipts: { type: Number, required: true, default: 0 },
  payments: { type: Number, required: true, default: 0 },
  closingBalance: { type: Number, required: true, default: 0 }
}, { _id: false });

const FinanceReportSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    reportDate: { type: Date, required: true },
    submittedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    submittedByName: { type: String, required: true },

    bankBalances: { type: [BankBalanceSchema], default: [] },
    cashBalance: {
      pettyCash: { type: Number, default: 0 },
      total: { type: Number, default: 0 }
    },
    nextDayApprovals: { type: [FinanceItemSchema], default: [] },

    summary: {
      totalExpenses: { type: Number, default: 0 },
      totalReceipts: { type: Number, default: 0 },
      totalPayments: { type: Number, default: 0 },
      bankBalance: { type: Number, default: 0 },
      pettyCashBalance: { type: Number, default: 0 },
      description: { type: String, default: "" }
    },

    exchangeRate: { type: Number, default: 0 },

    status: {
      type: String,
      default: "pending",
      enum: ["pending", "forwarded_to_ceo", "approved", "rejected"]
    },
    forwardedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    forwardedByName: { type: String, default: "" },
    forwardedAt: { type: Date, default: null },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    approvedByName: { type: String, default: "" },
    approvedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: "" },
    statusHistory: [
      {
        status: { type: String },
        by: { type: Schema.Types.ObjectId, ref: "User" },
        byName: { type: String },
        timestamp: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

FinanceReportSchema.index({ workspaceId: 1, reportDate: 1 }, { unique: true });
FinanceReportSchema.index({ workspaceId: 1, submittedBy: 1, reportDate: -1 });
FinanceReportSchema.index({ status: 1 });

if (process.env.NODE_ENV !== "production" && models.FinanceReport) {
  delete models.FinanceReport;
}

export default models.FinanceReport || model("FinanceReport", FinanceReportSchema);
