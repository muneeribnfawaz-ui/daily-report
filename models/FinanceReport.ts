import { Schema, models, model } from "mongoose";

const FinanceReportSchema = new Schema(
  {
    reportDate: { type: Date, required: true },
    submittedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    submittedByName: { type: String, required: true },

    // Financial fields
    openingBalance: { type: Number, default: 0 },
    cashReceived: { type: Number, default: 0 },
    cardSales: { type: Number, default: 0 },
    onlinePayments: { type: Number, default: 0 },
    expenses: { type: Number, default: 0 },
    refunds: { type: Number, default: 0 },
    pettyCash: { type: Number, default: 0 },
    bankDeposit: { type: Number, default: 0 },
    closingCashBalance: { type: Number, default: 0 },

    // Computed totals (stored for query efficiency)
    totalIncome: { type: Number, default: 0 },
    totalExpenses: { type: Number, default: 0 },
    netBalance: { type: Number, default: 0 },

    // Currency conversion
    exchangeRate: { type: Number, default: 0 },
    closingCashBalanceSAR: { type: Number, default: 0 },
    totalIncomeSAR: { type: Number, default: 0 },
    totalExpensesSAR: { type: Number, default: 0 },
    netBalanceSAR: { type: Number, default: 0 },

    // Approval workflow
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

FinanceReportSchema.index({ reportDate: 1 }, { unique: true });
FinanceReportSchema.index({ submittedBy: 1, reportDate: -1 });
FinanceReportSchema.index({ status: 1 });

if (process.env.NODE_ENV !== "production" && models.FinanceReport) {
  delete models.FinanceReport;
}

export default models.FinanceReport || model("FinanceReport", FinanceReportSchema);
