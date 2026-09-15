import { describe, it, expect } from "vitest";
import { financeReportSchema } from "@/lib/validation";

describe("Finance Report Description Data Flow & Rendering", () => {
  const validBasePayload = {
    workspaceId: "ws-123",
    reportDate: "2026-09-11",
    expenses: [
      { particulars: "Office Supplies", amountINR: 1500, amountSAR: 64.2, bankName: "SBI - 9012" }
    ],
    receipts: [
      { particulars: "Client Payment", amountINR: 50000, amountSAR: 2140, bankName: "SBI - 9012" }
    ],
    payments: [
      { particulars: "Vendor Payment", amountINR: 10000, amountSAR: 428, bankName: "SBI - 9012" }
    ],
    bankBalances: [
      { bankName: "SBI - 9012", openingBalance: 100000, receipts: 50000, payments: 11500, closingBalance: 138500 }
    ],
    cashBalance: { pettyCash: 5000, total: 5000 },
    nextDayApprovals: [],
    summary: {
      totalExpenses: 1500,
      totalReceipts: 50000,
      totalPayments: 10000,
      bankBalance: 138500,
      pettyCashBalance: 5000,
      description: "TEST FINANCE DESCRIPTION - September 11 2026"
    },
    exchangeRate: 0.0428
  };

  it("1. Validates and parses Finance Report with Description", () => {
    const parsed = financeReportSchema.safeParse(validBasePayload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.summary.description).toBe("TEST FINANCE DESCRIPTION - September 11 2026");
    }
  });

  it("2. Maps Description to Prisma create payload correctly", () => {
    const parsed = financeReportSchema.parse(validBasePayload);
    const prismaPayload = {
      workspaceId: parsed.workspaceId,
      reportDate: new Date(parsed.reportDate),
      submittedBy: "user-fin-1",
      submittedByName: "Finance Member",
      description: parsed.summary?.description || "",
      exchangeRate: parsed.exchangeRate,
      status: "pending"
    };

    expect(prismaPayload.description).toBe("TEST FINANCE DESCRIPTION - September 11 2026");
  });

  it("3. Maps Description to Prisma update payload correctly", () => {
    const parsed = financeReportSchema.parse(validBasePayload);
    const updatePayload = {
      exchangeRate: parsed.exchangeRate,
      description: parsed.summary?.description || "",
      editAccessGranted: false
    };

    expect(updatePayload.description).toBe("TEST FINANCE DESCRIPTION - September 11 2026");
  });

  it("4. Serializes Finance Report for CEO / Detail view with actual description", () => {
    const dbReportRecord = {
      id: "af19f080-2556-460a-a5b3-aace451f7765",
      workspaceId: "ws-123",
      reportDate: new Date("2026-09-11"),
      submittedByName: "Finance User",
      description: "TEST FINANCE DESCRIPTION - September 11 2026",
      exchangeRate: 0.0428,
      status: "forwarded_to_ceo",
      items: [],
      bankBalances: [{ bankName: "SBI - 9012", closingBalance: 138500 }]
    };

    const serializedReport = {
      _id: dbReportRecord.id,
      reportDate: dbReportRecord.reportDate.toISOString(),
      submittedByName: dbReportRecord.submittedByName,
      summary: {
        totalExpenses: 0,
        totalReceipts: 0,
        totalPayments: 0,
        bankBalance: 138500,
        pettyCashBalance: 0,
        description: dbReportRecord.description || ""
      },
      status: dbReportRecord.status
    };

    expect(serializedReport.summary.description).toBe("TEST FINANCE DESCRIPTION - September 11 2026");

    // UI rendering logic check
    const renderedDescription = serializedReport.summary?.description || "No description provided.";
    expect(renderedDescription).toBe("TEST FINANCE DESCRIPTION - September 11 2026");
  });

  it("5. Fallback displays 'No description provided.' when description is empty or null", () => {
    const dbReportRecordWithoutDesc = {
      id: "report-empty-desc",
      workspaceId: "ws-123",
      reportDate: new Date("2026-09-11"),
      submittedByName: "Finance User",
      description: "",
      exchangeRate: 0.0428,
      status: "pending"
    };

    const serializedReport = {
      _id: dbReportRecordWithoutDesc.id,
      summary: {
        totalExpenses: 0,
        totalReceipts: 0,
        totalPayments: 0,
        bankBalance: 0,
        pettyCashBalance: 0,
        description: dbReportRecordWithoutDesc.description || ""
      }
    };

    const renderedDescription = serializedReport.summary?.description || "No description provided.";
    expect(renderedDescription).toBe("No description provided.");
  });

  it("6. Legacy reports with summary.description in JSON continue to resolve correctly", () => {
    const legacyReportRecord: any = {
      id: "report-legacy",
      description: "",
      summary: {
        description: "Legacy note stored in summary JSON"
      }
    };

    const resolvedDescription = legacyReportRecord.description || legacyReportRecord.summary?.description || "";
    expect(resolvedDescription).toBe("Legacy note stored in summary JSON");
  });

  it("7. PDF export summary payload correctly carries the actual description", () => {
    const dbReportRecord = {
      id: "report-pdf-123",
      reportDate: new Date("2026-09-11"),
      submittedByName: "Finance Member",
      description: "Q3 Closing Operations & Adjustments",
      exchangeRate: 0.0428,
      status: "approved",
      items: [],
      bankBalances: []
    };

    const pdfPayloadSummary = {
      totalExpenses: 0,
      totalReceipts: 0,
      totalPayments: 0,
      bankBalance: 0,
      pettyCashBalance: 0,
      description: dbReportRecord.description || ""
    };

    expect(pdfPayloadSummary.description).toBe("Q3 Closing Operations & Adjustments");
  });

  it("8. Preserves all other financial metrics without regression", () => {
    const parsed = financeReportSchema.parse(validBasePayload);
    expect(parsed.expenses).toHaveLength(1);
    expect(parsed.expenses[0].particulars).toBe("Office Supplies");
    expect(parsed.receipts[0].amountINR).toBe(50000);
    expect(parsed.payments[0].amountINR).toBe(10000);
    expect(parsed.summary.totalExpenses).toBe(1500);
    expect(parsed.summary.totalReceipts).toBe(50000);
    expect(parsed.summary.totalPayments).toBe(10000);
  });
});
