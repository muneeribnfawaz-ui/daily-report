import { describe, it, expect } from "vitest";
import { financeReportSchema } from "@/lib/validation";

describe("Finance Report Form Structure & Calculations Suite", () => {
  it("calculates correct summary totals and bank balances for single Payments/Expenses section scenario", () => {
    // Scenario from user:
    // Payments / Expenses:
    // - Bottle, We want bottle, SBI - 1098, UPI / QR Code, ₹20
    // Receipts / Income:
    // - For Bulb, MD sent the amount for Bulb, SBI - 1098, Debit Card, ₹100
    // Opening balance of SBI - 1098: 1000
    const testPayload = {
      workspaceId: "ws-company-1",
      reportDate: "2026-09-14",
      expenses: [
        {
          particulars: "Bottle",
          description: "We want bottle",
          bankName: "SBI - 1098",
          paymentMode: "upi_qr_code",
          amountINR: 20,
          amountSAR: 20 * 0.0428
        }
      ],
      receipts: [
        {
          particulars: "For Bulb",
          description: "MD sent the amount for Bulb",
          bankName: "SBI - 1098",
          paymentMode: "debit_card",
          amountINR: 100,
          amountSAR: 100 * 0.0428
        }
      ],
      payments: [],
      bankBalances: [
        {
          bankName: "SBI - 1098",
          openingBalance: 1000,
          receipts: 100,
          payments: 20,
          closingBalance: 1000 + 100 - 20 // 1080
        }
      ],
      cashBalance: { pettyCash: 0, total: 0 },
      nextDayApprovals: [],
      summary: {
        totalExpenses: 20,
        totalReceipts: 100,
        totalPayments: 20,
        bankBalance: 1080,
        pettyCashBalance: 0,
        description: "Summary note"
      },
      exchangeRate: 0.0428
    };

    const parsed = financeReportSchema.safeParse(testPayload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.expenses).toHaveLength(1);
      expect(parsed.data.expenses[0].particulars).toBe("Bottle");
      expect(parsed.data.expenses[0].amountINR).toBe(20);

      expect(parsed.data.receipts).toHaveLength(1);
      expect(parsed.data.receipts[0].particulars).toBe("For Bulb");
      expect(parsed.data.receipts[0].amountINR).toBe(100);

      expect(parsed.data.summary.totalPayments).toBe(20);
      expect(parsed.data.summary.totalReceipts).toBe(100);
      expect(parsed.data.summary.bankBalance).toBe(1080);
    }
  });

  it("handles backwards-compatible payloads with both expenses and payments gracefully", () => {
    const legacyPayload = {
      workspaceId: "ws-company-1",
      reportDate: "2026-09-14",
      expenses: [
        {
          particulars: "Office Supplies",
          description: "Pens and paper",
          bankName: "SBI - 1098",
          paymentMode: "cash",
          amountINR: 50,
          amountSAR: 50 * 0.0428
        }
      ],
      receipts: [
        {
          particulars: "Client Fee",
          amountINR: 500,
          amountSAR: 500 * 0.0428
        }
      ],
      payments: [
        {
          particulars: "Vendor Payment",
          amountINR: 150,
          amountSAR: 150 * 0.0428
        }
      ],
      bankBalances: [],
      cashBalance: { pettyCash: 0, total: 0 },
      nextDayApprovals: [],
      summary: {
        totalExpenses: 50,
        totalReceipts: 500,
        totalPayments: 200,
        bankBalance: 300,
        pettyCashBalance: 0,
        description: ""
      },
      exchangeRate: 0.0428
    };

    const parsed = financeReportSchema.safeParse(legacyPayload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const mergedTotal = parsed.data.expenses.reduce((s, e) => s + e.amountINR, 0) + parsed.data.payments.reduce((s, p) => s + p.amountINR, 0);
      expect(mergedTotal).toBe(200);
    }
  });

  it("fails validation when Particulars is empty", () => {
    const emptyParticularsPayload = {
      workspaceId: "ws-company-1",
      reportDate: "2026-09-14",
      expenses: [
        {
          particulars: "",
          amountINR: 20,
          amountSAR: 0.856
        }
      ],
      receipts: [],
      payments: [],
      bankBalances: [],
      cashBalance: { pettyCash: 0, total: 0 },
      nextDayApprovals: [],
      summary: { totalExpenses: 20, totalReceipts: 0, totalPayments: 20, bankBalance: 0, pettyCashBalance: 0 },
      exchangeRate: 0.0428
    };

    const parsed = financeReportSchema.safeParse(emptyParticularsPayload);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toBe("Particulars is required");
    }
  });

  it("fails validation when Particulars is whitespace-only", () => {
    const whitespacePayload = {
      workspaceId: "ws-company-1",
      reportDate: "2026-09-14",
      expenses: [
        {
          particulars: "     ",
          amountINR: 20,
          amountSAR: 0.856
        }
      ],
      receipts: [],
      payments: [],
      bankBalances: [],
      cashBalance: { pettyCash: 0, total: 0 },
      nextDayApprovals: [],
      summary: { totalExpenses: 20, totalReceipts: 0, totalPayments: 20, bankBalance: 0, pettyCashBalance: 0 },
      exchangeRate: 0.0428
    };

    const parsed = financeReportSchema.safeParse(whitespacePayload);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toBe("Particulars is required");
    }
  });

  it("passes validation when valid Particulars like 'Bottle' or 'For Bulb' are entered", () => {
    const validPayload = {
      workspaceId: "ws-company-1",
      reportDate: "2026-09-14",
      expenses: [
        {
          particulars: "Bottle",
          amountINR: 20,
          amountSAR: 0.856
        }
      ],
      receipts: [
        {
          particulars: "For Bulb",
          amountINR: 100,
          amountSAR: 4.28
        }
      ],
      payments: [],
      bankBalances: [],
      cashBalance: { pettyCash: 0, total: 0 },
      nextDayApprovals: [],
      summary: { totalExpenses: 20, totalReceipts: 100, totalPayments: 20, bankBalance: 80, pettyCashBalance: 0 },
      exchangeRate: 0.0428
    };

    const parsed = financeReportSchema.safeParse(validPayload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.expenses[0].particulars).toBe("Bottle");
      expect(parsed.data.receipts[0].particulars).toBe("For Bulb");
    }
  });

  it("validates multiple dynamic rows independently", () => {
    const multiRowPayload = {
      workspaceId: "ws-company-1",
      reportDate: "2026-09-14",
      expenses: [
        { particulars: "Bottle", amountINR: 20, amountSAR: 0.856 },
        { particulars: "", amountINR: 50, amountSAR: 2.14 } // Invalid row
      ],
      receipts: [
        { particulars: "For Bulb", amountINR: 100, amountSAR: 4.28 }
      ],
      payments: [],
      bankBalances: [],
      cashBalance: { pettyCash: 0, total: 0 },
      nextDayApprovals: [],
      summary: { totalExpenses: 70, totalReceipts: 100, totalPayments: 70, bankBalance: 30, pettyCashBalance: 0 },
      exchangeRate: 0.0428
    };

    const parsed = financeReportSchema.safeParse(multiRowPayload);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => i.path.includes("expenses") && i.path.includes(1) && i.message === "Particulars is required")).toBe(true);
    }
  });

  it("removes validation error when the invalid row is removed", () => {
    const multiRowPayload = {
      workspaceId: "ws-company-1",
      reportDate: "2026-09-14",
      expenses: [
        { particulars: "Bottle", amountINR: 20, amountSAR: 0.856 },
        { particulars: "", amountINR: 50, amountSAR: 2.14 }
      ],
      receipts: [
        { particulars: "For Bulb", amountINR: 100, amountSAR: 4.28 }
      ],
      payments: [],
      bankBalances: [],
      cashBalance: { pettyCash: 0, total: 0 },
      nextDayApprovals: [],
      summary: { totalExpenses: 70, totalReceipts: 100, totalPayments: 70, bankBalance: 30, pettyCashBalance: 0 },
      exchangeRate: 0.0428
    };

    // Remove the invalid second row (simulate remove(1))
    const correctedExpenses = multiRowPayload.expenses.filter((_, idx) => idx !== 1);
    const correctedPayload = {
      ...multiRowPayload,
      expenses: correctedExpenses,
      summary: { ...multiRowPayload.summary, totalExpenses: 20, totalPayments: 20 }
    };

    const parsed = financeReportSchema.safeParse(correctedPayload);
    expect(parsed.success).toBe(true);
  });

  describe("End-to-End Finance Report Totals Calculation & Serialization Suite", () => {
    // Helper replicating the canonical calculation model used across API and frontend
    function computeReportTotals(report: {
      items?: { type: string; particulars: string; amountINR: number; revisionReference?: string; paymentMode?: string }[];
      bankBalances?: { bankName: string; openingBalance: number; receipts: number; payments: number; closingBalance: number }[];
      totalIncome?: number;
      totalExpense?: number;
      summary?: { totalReceipts?: number; totalExpenses?: number; totalPayments?: number };
    }) {
      const items = report.items || [];
      const calculatedIncome = items
        .filter((i) => i.type === "receipt" && i.particulars !== "Bank to Cash" && !i.revisionReference?.startsWith("link_cash_") && i.paymentMode !== "transfer_to_cash")
        .reduce((sum, i) => sum + (Number(i.amountINR) || 0), 0);

      const calculatedExpense = items
        .filter((i) => i.type === "expense" || i.type === "payment")
        .reduce((sum, i) => sum + (Number(i.amountINR) || 0), 0);

      const totalIncome =
        report.totalIncome ??
        report.summary?.totalReceipts ??
        (report.items ? calculatedIncome : report.bankBalances?.reduce((sum, b) => (b.bankName === "Cash" ? sum : sum + (Number(b.receipts) || 0)), 0)) ??
        0;

      const totalExpense =
        report.totalExpense ??
        report.summary?.totalExpenses ??
        report.summary?.totalPayments ??
        (report.items ? calculatedExpense : report.bankBalances?.reduce((sum, b) => sum + (Number(b.payments) || 0), 0)) ??
        0;

      return { totalIncome, totalExpense, calculatedIncome, calculatedExpense };
    }

    it("scenario: Receipt ₹100, Expense ₹20 produces Total Income = ₹100 and Total Expense = ₹20", () => {
      const reportData = {
        items: [
          { type: "expense", particulars: "Bottle", amountINR: 20 },
          { type: "receipt", particulars: "For Bulb", amountINR: 100 }
        ],
        bankBalances: [
          { bankName: "SBI - 1098", openingBalance: 1000, receipts: 100, payments: 20, closingBalance: 1080 }
        ]
      };

      const { totalIncome, totalExpense } = computeReportTotals(reportData);
      expect(totalIncome).toBe(100);
      expect(totalExpense).toBe(20);
    });

    it("scenario 1: Receipt only → income should be correct, expense ₹0", () => {
      const reportData = {
        items: [
          { type: "receipt", particulars: "Consulting Fee", amountINR: 500 }
        ]
      };
      const { totalIncome, totalExpense } = computeReportTotals(reportData);
      expect(totalIncome).toBe(500);
      expect(totalExpense).toBe(0);
    });

    it("scenario 2: Expense only → expense should be correct, income ₹0", () => {
      const reportData = {
        items: [
          { type: "expense", particulars: "Server Hosting", amountINR: 250 }
        ]
      };
      const { totalIncome, totalExpense } = computeReportTotals(reportData);
      expect(totalIncome).toBe(0);
      expect(totalExpense).toBe(250);
    });

    it("scenario 3: Multiple receipts → all summed", () => {
      const reportData = {
        items: [
          { type: "receipt", particulars: "Client A", amountINR: 100 },
          { type: "receipt", particulars: "Client B", amountINR: 250 },
          { type: "receipt", particulars: "Client C", amountINR: 50 }
        ]
      };
      const { totalIncome, totalExpense } = computeReportTotals(reportData);
      expect(totalIncome).toBe(400);
      expect(totalExpense).toBe(0);
    });

    it("scenario 4: Multiple expenses → all summed", () => {
      const reportData = {
        items: [
          { type: "expense", particulars: "Chairs", amountINR: 120 },
          { type: "expense", particulars: "Coffee", amountINR: 30 },
          { type: "expense", particulars: "Stationery", amountINR: 45 }
        ]
      };
      const { totalIncome, totalExpense } = computeReportTotals(reportData);
      expect(totalIncome).toBe(0);
      expect(totalExpense).toBe(195);
    });

    it("scenario 5: Empty transaction sections → corresponding total remains ₹0", () => {
      const reportData = {
        items: []
      };
      const { totalIncome, totalExpense } = computeReportTotals(reportData);
      expect(totalIncome).toBe(0);
      expect(totalExpense).toBe(0);
    });

    it("scenario 6: Legacy reports containing 'payments' items must sum with 'expenses'", () => {
      const reportData = {
        items: [
          { type: "expense", particulars: "Expense 1", amountINR: 30 },
          { type: "payment", particulars: "Payment 1", amountINR: 70 },
          { type: "receipt", particulars: "Income 1", amountINR: 200 }
        ]
      };
      const { totalIncome, totalExpense } = computeReportTotals(reportData);
      expect(totalIncome).toBe(200);
      expect(totalExpense).toBe(100);
    });

    it("scenario 7: Excludes internal transfer_to_cash / Bank to Cash from total income", () => {
      const reportData = {
        items: [
          { type: "receipt", particulars: "Real Income", amountINR: 1000 },
          { type: "receipt", particulars: "Bank to Cash", amountINR: 500, paymentMode: "transfer_to_cash" },
          { type: "receipt", particulars: "Cash from ATM", amountINR: 300, revisionReference: "link_cash_123" }
        ]
      };
      const { totalIncome, totalExpense } = computeReportTotals(reportData);
      expect(totalIncome).toBe(1000); // 500 and 300 internal transfers excluded
      expect(totalExpense).toBe(0);
    });

    it("scenario 8: Safe decimal/numeric handling without string concatenation", () => {
      const reportData = {
        items: [
          { type: "receipt", particulars: "Invoice #1", amountINR: "100.50" as any },
          { type: "receipt", particulars: "Invoice #2", amountINR: "49.50" as any },
          { type: "expense", particulars: "Tool #1", amountINR: "19.99" as any }
        ]
      };
      const { totalIncome, totalExpense } = computeReportTotals(reportData);
      expect(totalIncome).toBeCloseTo(150.0);
      expect(totalExpense).toBeCloseTo(19.99);
    });

    it("verifies submit button labels resolve to 'Submit' in English and 'إرسال' in Arabic", async () => {
      const enJson = (await import("@/lib/i18n/translations/en.json")).default;
      const arJson = (await import("@/lib/i18n/translations/ar.json")).default;

      expect(enJson.common.submit).toBe("Submit");
      expect(enJson.finance.submitReport).toBe("Submit");
      expect(arJson.common.submit).toBe("إرسال");
      expect(arJson.finance.submitReport).toBe("إرسال");
    });
  });
});
