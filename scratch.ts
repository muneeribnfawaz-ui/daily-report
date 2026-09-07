import { financeReportSchema } from "./lib/validation";

const payload = {
  reportDate: "2026-09-07",
  expenses: [],
  receipts: [],
  payments: [],
  bankBalances: [],
  cashBalance: { pettyCash: 0, total: 0 },
  nextDayApprovals: [
    {
      particulars: "Test",
      description: "Desc",
      priority: "medium",
      revisionReference: "",
      amountINR: 100,
      amountSAR: 4.28
    }
  ],
  summary: {
    totalExpenses: 0,
    totalReceipts: 0,
    totalPayments: 0,
    bankBalance: 0,
    pettyCashBalance: 0,
    description: ""
  },
  exchangeRate: 0.0428
};

const parsed = financeReportSchema.safeParse(payload);
if (!parsed.success) {
  console.log(JSON.stringify(parsed.error.issues, null, 2));
} else {
  console.log("Success!");
}
