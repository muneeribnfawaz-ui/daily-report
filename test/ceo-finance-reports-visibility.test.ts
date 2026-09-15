import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getFinanceReports } from "@/app/api/finance-reports/route";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn()
}));

vi.mock("@/lib/crypto", () => ({
  encryptPayload: vi.fn().mockImplementation((data) => Promise.resolve(data)),
  decryptPayload: vi.fn().mockImplementation((data) => Promise.resolve(data))
}));

vi.mock("@/lib/db", () => {
  return {
    default: {
      financeReport: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn()
      },
      workspace: {
        findMany: vi.fn(),
        findUnique: vi.fn()
      },
      workspaceMember: {
        findMany: vi.fn()
      },
      user: {
        findMany: vi.fn()
      }
    }
  };
});

import { getCurrentUser } from "@/lib/auth";
import db from "@/lib/db";

describe("CEO Finance Reports Visibility & Multi-Role Scenarios", () => {
  const companyAId = "ws-mif-technologies";
  const companyBId = "ws-other-company";
  const ceoWorkspaceId = "ws-ceo-executive";

  const ceoMuneer = {
    id: "user-ceo-muneer",
    name: "Muneer (CEO)",
    email: "ceo@mif.com",
    role: "ceo",
    workspaceId: ceoWorkspaceId,
    status: "active"
  };

  const financeTLHealan = {
    id: "user-tl-healan",
    name: "Healan",
    email: "healan@mif.com",
    role: "team_lead",
    workspaceId: companyAId,
    departments: [{ name: "Finance" }]
  };

  const financeTMSameena = {
    id: "user-tm-sameena",
    name: "Sameena",
    email: "sameena@mif.com",
    role: "team_member",
    workspaceId: companyAId,
    departments: [{ name: "Finance" }]
  };

  const ceoMemberships = [
    {
      userId: ceoMuneer.id,
      workspaceId: ceoWorkspaceId,
      status: "active",
      isActive: true,
      workspace: { id: ceoWorkspaceId, type: "ceo" }
    }
  ];

  const ceoOwnedCompanies = [
    { id: companyAId, name: "MIF Technologies", ownerWorkspaceId: ceoWorkspaceId, isActive: true, isDeleted: false }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentUser as any).mockResolvedValue(ceoMuneer);
    (db.workspaceMember.findMany as any).mockResolvedValue(ceoMemberships);
    (db.workspace.findMany as any).mockResolvedValue(ceoOwnedCompanies);
  });

  it("Scenario A: Finance Team Member (Sameena) submits a pending Finance Report → CEO of the same workspace can see it", async () => {
    const reportSameena = {
      id: "rep-sameena-001",
      workspaceId: companyAId,
      reportDate: new Date("2026-09-14T00:00:00.000Z"),
      submittedBy: financeTMSameena.id,
      submittedByName: "Sameena",
      status: "pending",
      description: "Daily finance summary from Sameena",
      items: [
        { type: "receipt", particulars: "Client Payment", amountINR: 15000, paymentMode: "bank" },
        { type: "expense", particulars: "Office Supplies", amountINR: 2000, paymentMode: "cash" }
      ],
      bankBalances: [
        { bankName: "SBI", openingBalance: 50000, receipts: 15000, payments: 2000, closingBalance: 63000 }
      ]
    };

    (db.financeReport.findMany as any).mockResolvedValue([reportSameena]);

    const request = new Request(`http://localhost:3000/api/finance-reports?workspaceId=${companyAId}`);
    const response = await getFinanceReports(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);

    // Verify DB query was not restricted to excluding pending
    expect(db.financeReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workspaceId: companyAId }
      })
    );

    expect(json.data).toHaveLength(1);
    expect(json.data[0].id).toBe("rep-sameena-001");
    expect(json.data[0].submittedByName).toBe("Sameena");
    expect(json.data[0].status).toBe("pending");
    expect(json.data[0].totalIncome).toBe(15000);
    expect(json.data[0].totalExpense).toBe(2000);
  });

  it("Scenario B: Finance Team Lead (Healan) submits a pending Finance Report → CEO of the same workspace can see it", async () => {
    const reportHealan = {
      id: "rep-healan-001",
      workspaceId: companyAId,
      reportDate: new Date("2026-09-14T00:00:00.000Z"),
      submittedBy: financeTLHealan.id,
      submittedByName: "Healan",
      status: "pending",
      description: "Healan daily transactions",
      items: [
        { type: "receipt", particulars: "Invoicing", amountINR: 50000, paymentMode: "bank" },
        { type: "expense", particulars: "Vendor Settlement", amountINR: 12000, paymentMode: "bank" }
      ],
      bankBalances: [
        { bankName: "HDFC", openingBalance: 100000, receipts: 50000, payments: 12000, closingBalance: 138000 }
      ]
    };

    (db.financeReport.findMany as any).mockResolvedValue([reportHealan]);

    const request = new Request(`http://localhost:3000/api/finance-reports?workspaceId=${companyAId}`);
    const response = await getFinanceReports(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].id).toBe("rep-healan-001");
    expect(json.data[0].submittedByName).toBe("Healan");
    expect(json.data[0].status).toBe("pending");
    expect(json.data[0].totalIncome).toBe(50000);
    expect(json.data[0].totalExpense).toBe(12000);
  });

  it("Scenario C: CEO sees multiple Finance Reports from different finance employees in the same workspace", async () => {
    const reports = [
      {
        id: "rep-1",
        workspaceId: companyAId,
        reportDate: new Date("2026-09-14T00:00:00.000Z"),
        submittedBy: financeTLHealan.id,
        submittedByName: "Healan",
        status: "pending",
        items: [],
        bankBalances: []
      },
      {
        id: "rep-2",
        workspaceId: companyAId,
        reportDate: new Date("2026-09-13T00:00:00.000Z"),
        submittedBy: financeTMSameena.id,
        submittedByName: "Sameena",
        status: "approved",
        items: [],
        bankBalances: []
      }
    ];

    (db.financeReport.findMany as any).mockResolvedValue(reports);

    const request = new Request(`http://localhost:3000/api/finance-reports?workspaceId=${companyAId}`);
    const response = await getFinanceReports(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toHaveLength(2);
    expect(json.data.map((r: any) => r.submittedByName)).toEqual(["Healan", "Sameena"]);
  });

  it("Scenario D: CEO of Company A cannot query or access Company B reports", async () => {
    // Attempting to query company B which CEO does not own
    const request = new Request(`http://localhost:3000/api/finance-reports?workspaceId=${companyBId}`);
    const response = await getFinanceReports(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    // where clause mapped to non_existent_id
    expect(db.financeReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workspaceId: "non_existent_id" }
      })
    );
  });

  it("Scenario E: Filtering by explicit status (e.g. status=approved) correctly filters by that status", async () => {
    (db.financeReport.findMany as any).mockResolvedValue([]);

    const request = new Request(`http://localhost:3000/api/finance-reports?workspaceId=${companyAId}&status=approved`);
    await getFinanceReports(request);

    expect(db.financeReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workspaceId: companyAId, status: "approved" }
      })
    );
  });

  it("Scenario F: Finance Report calculations (Total Income, Total Expense, Bank Balances) compute correctly", async () => {
    const complexReport = {
      id: "rep-calc-001",
      workspaceId: companyAId,
      reportDate: new Date("2026-09-14T00:00:00.000Z"),
      submittedByName: "Sameena",
      status: "pending",
      description: "Calculation Verification",
      items: [
        { type: "receipt", particulars: "Customer Revenue", amountINR: 45000, paymentMode: "bank" },
        { type: "receipt", particulars: "Bank to Cash", amountINR: 5000, paymentMode: "cash" }, // should be ignored from income
        { type: "expense", particulars: "Office Rent", amountINR: 20000, paymentMode: "bank" },
        { type: "payment", particulars: "Utility Bill", amountINR: 3000, paymentMode: "bank" }
      ],
      bankBalances: [
        { bankName: "SBI Main", openingBalance: 100000, receipts: 45000, payments: 23000, closingBalance: 122000 },
        { bankName: "Cash", openingBalance: 5000, receipts: 5000, payments: 2000, closingBalance: 8000 }
      ]
    };

    (db.financeReport.findMany as any).mockResolvedValue([complexReport]);

    const request = new Request(`http://localhost:3000/api/finance-reports?workspaceId=${companyAId}`);
    const response = await getFinanceReports(request);
    const json = await response.json();

    const report = json.data[0];
    expect(report.totalIncome).toBe(45000); // 45000 (excludes Bank to Cash transfer)
    expect(report.totalExpense).toBe(23000); // 20000 + 3000
    expect(report.summary.bankBalance).toBe(130000); // 122000 + 8000
    expect(report.summary.pettyCashBalance).toBe(8000); // Cash closing balance
  });
});
