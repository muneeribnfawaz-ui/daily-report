import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getFinanceReports, POST as createFinanceReport } from "@/app/api/finance-reports/route";
import { GET as getFinanceReportById, PUT as updateFinanceReportById, DELETE as deleteFinanceReportById } from "@/app/api/finance-reports/[id]/route";
import { POST as approveFinanceReport } from "@/app/api/finance-reports/[id]/approve/route";
import { GET as getFinanceReportPdf } from "@/app/api/finance-reports/[id]/pdf/route";
import { GET as getFinanceDashboard } from "@/app/api/finance-reports/dashboard/route";
import { GET as getMoneyRequests, POST as createMoneyRequest } from "@/app/api/money-requests/route";
import { GET as getMoneyRequestById, PUT as updateMoneyRequestById, DELETE as deleteMoneyRequestById } from "@/app/api/money-requests/[id]/route";
import { POST as approveMoneyRequest } from "@/app/api/money-requests/[id]/approve/route";
import { GET as getBankAccounts, POST as createBankAccount } from "@/app/api/finance/bank-accounts/route";
import { GET as getBankAccountById, PUT as updateBankAccountById } from "@/app/api/finance/bank-accounts/[id]/route";
import { GET as getPettyCash, POST as createPettyCashTransaction } from "@/app/api/finance/petty-cash/route";
import { getUserAllowedWorkspaceIds, buildWorkspaceFilter, isWorkspaceAuthorizedForUser } from "@/lib/workspace-context";

// Mock dependencies
vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn()
}));

vi.mock("@/lib/api-auth", () => ({
  authorizeApi: vi.fn()
}));

vi.mock("@/lib/crypto", () => ({
  encryptPayload: vi.fn().mockImplementation((data) => Promise.resolve(data)),
  decryptPayload: vi.fn().mockImplementation((data) => Promise.resolve(data))
}));

vi.mock("@/lib/crypto/db-encryption", () => ({
  encryptDbField: vi.fn((val) => `enc_${val}`),
  decryptDbField: vi.fn((val) => val?.replace(/^enc_/, "") || val),
  hashForLookup: vi.fn((val) => `hash_${val}`),
  computeRowSignature: vi.fn(() => "mock-signature")
}));

vi.mock("@/lib/currency", () => ({
  getINRtoSARRate: vi.fn().mockResolvedValue(0.0428),
  convertINRtoSAR: vi.fn((amount: number) => amount * 0.0428)
}));

vi.mock("@/lib/notifications", () => ({
  notifyCeoOfMoneyRequests: vi.fn().mockResolvedValue(undefined),
  getCeoUserIdsForWorkspace: vi.fn().mockResolvedValue(["ceo-user-id"])
}));

vi.mock("@/lib/audit", () => ({
  logAuditEntry: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("@/lib/petty-cash-sync", () => ({
  syncReportCashToPettyCash: vi.fn().mockResolvedValue(undefined),
  getOrCreatePettyCash: vi.fn().mockResolvedValue({ balance: 5000 })
}));

vi.mock("@/lib/finance-pdf", () => ({
  buildFinanceReportPdfBuffer: vi.fn().mockResolvedValue(Buffer.from("mock-pdf"))
}));

vi.mock("@/lib/db", () => {
  return {
    default: {
      financeReport: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn()
      },
      financeReportItem: {
        deleteMany: vi.fn(),
        createMany: vi.fn()
      },
      financeReportBankBalance: {
        deleteMany: vi.fn(),
        createMany: vi.fn()
      },
      moneyRequest: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        createMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
      },
      bankAccount: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
      },
      transaction: {
        findMany: vi.fn(),
        create: vi.fn()
      },
      workspace: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn()
      },
      workspaceMember: {
        findMany: vi.fn(),
        findFirst: vi.fn()
      },
      user: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn()
      },
      notification: {
        create: vi.fn(),
        createMany: vi.fn()
      }
    }
  };
});

import { getCurrentUser } from "@/lib/auth";
import { authorizeApi } from "@/lib/api-auth";
import db from "@/lib/db";

describe("Multi-Company Finance Isolation Tests", () => {
  const companyAId = "comp-a-workspace-101"; // e.g. "Company Alpha" where Sujitha works
  const companyBId = "comp-b-absalkhan-202"; // e.g. "Absalkhan private limited"
  const ceoWorkspaceId = "ceo-workspace-999";

  const ceoUser = {
    id: "user-ceo-1",
    name: "Executive CEO",
    email: "ceo@company.com",
    role: "ceo",
    workspaceId: ceoWorkspaceId,
    status: "active"
  };

  const sujithaUser = {
    id: "user-sujitha-company-a",
    name: "Sujitha",
    email: "sujitha@company-a.com",
    role: "team_lead",
    workspaceId: companyAId,
    status: "active",
    departments: [{ name: "Finance" }]
  };

  const absalFinanceUser = {
    id: "user-absal-finance",
    name: "Absal Finance",
    email: "finance@absalkhan.com",
    role: "team_lead",
    workspaceId: companyBId,
    status: "active",
    departments: [{ name: "Finance" }]
  };

  const mockCeoMemberships = [
    {
      userId: ceoUser.id,
      workspaceId: ceoWorkspaceId,
      status: "active",
      isActive: true,
      workspace: { id: ceoWorkspaceId, type: "ceo" }
    }
  ];

  const mockCeoOwnedCompanies = [
    { id: companyAId, name: "Company Alpha", ownerWorkspaceId: ceoWorkspaceId, isActive: true, isDeleted: false },
    { id: companyBId, name: "Absalkhan private limited", ownerWorkspaceId: ceoWorkspaceId, isActive: true, isDeleted: false }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Workspace Context Helper Isolation", () => {
    it("resolves all owned company workspace IDs for CEO", async () => {
      (db.workspaceMember.findMany as any).mockResolvedValue(mockCeoMemberships);
      (db.workspace.findMany as any).mockResolvedValue(mockCeoOwnedCompanies);

      const allowedIds = await getUserAllowedWorkspaceIds(ceoUser);
      expect(allowedIds).toContain(companyAId);
      expect(allowedIds).toContain(companyBId);
      expect(allowedIds).toContain(ceoWorkspaceId);
    });

    it("resolves only assigned company workspace ID for regular employee", async () => {
      (db.workspaceMember.findMany as any).mockResolvedValue([
        { userId: sujithaUser.id, workspaceId: companyAId, status: "active", isActive: true }
      ]);

      const allowedIds = await getUserAllowedWorkspaceIds(sujithaUser);
      expect(allowedIds).toEqual([companyAId]);
      expect(allowedIds).not.toContain(companyBId);
    });

    it("builds strict where filter matching requested company context for CEO", async () => {
      (db.workspaceMember.findMany as any).mockResolvedValue(mockCeoMemberships);
      (db.workspace.findMany as any).mockResolvedValue(mockCeoOwnedCompanies);

      // CEO selects "Absalkhan private limited" (Company B)
      const filterB = await buildWorkspaceFilter(ceoUser, companyBId);
      expect(filterB).toEqual({ workspaceId: companyBId });

      // CEO selects Company A
      const filterA = await buildWorkspaceFilter(ceoUser, companyAId);
      expect(filterA).toEqual({ workspaceId: companyAId });

      // CEO attempts to query an unauthorized foreign workspace
      const filterUnauthorized = await buildWorkspaceFilter(ceoUser, "unauthorized-company-999");
      expect(filterUnauthorized).toEqual({ workspaceId: "non_existent_id" });
    });
  });

  describe("Finance Reports List Query (Scenario A & B)", () => {
    it("Scenario A: When CEO selects Absalkhan Private Limited (Company B), query strictly filters by Company B and never returns Sujitha's reports from Company A", async () => {
      (getCurrentUser as any).mockResolvedValue(ceoUser);
      (db.workspaceMember.findMany as any).mockResolvedValue(mockCeoMemberships);
      (db.workspace.findMany as any).mockResolvedValue(mockCeoOwnedCompanies);

      const mockCompanyBReports = [
        {
          id: "rep-b-1",
          workspaceId: companyBId,
          reportDate: new Date(),
          submittedBy: absalFinanceUser.id,
          submittedByName: "Absal Finance",
          status: "pending",
          items: [],
          bankBalances: []
        }
      ];

      (db.financeReport.findMany as any).mockResolvedValue(mockCompanyBReports);

      const request = new Request(`http://localhost:3000/api/finance-reports?workspaceId=${companyBId}`);
      const response = await getFinanceReports(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);

      // Verify the DB query filter
      expect(db.financeReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workspaceId: companyBId
          })
        })
      );

      // Ensure returned data contains only Company B reports
      expect(json.data).toHaveLength(1);
      expect(json.data[0].workspaceId).toBe(companyBId);
      expect(json.data[0].submittedByName).toBe("Absal Finance");
    });

    it("Scenario B: When CEO switches to Company A, returns Company A reports (Sujitha)", async () => {
      (getCurrentUser as any).mockResolvedValue(ceoUser);
      (db.workspaceMember.findMany as any).mockResolvedValue(mockCeoMemberships);
      (db.workspace.findMany as any).mockResolvedValue(mockCeoOwnedCompanies);

      const mockCompanyAReports = [
        {
          id: "rep-a-1",
          workspaceId: companyAId,
          reportDate: new Date(),
          submittedBy: sujithaUser.id,
          submittedByName: "Sujitha",
          status: "pending",
          items: [],
          bankBalances: []
        }
      ];

      (db.financeReport.findMany as any).mockResolvedValue(mockCompanyAReports);

      const request = new Request(`http://localhost:3000/api/finance-reports?workspaceId=${companyAId}`);
      const response = await getFinanceReports(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(db.financeReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workspaceId: companyAId
          })
        })
      );
      expect(json.data[0].submittedByName).toBe("Sujitha");
    });
  });

  describe("Finance Report Creation Workspace Authorization", () => {
    it("rejects report submission if user attempts to submit for an unauthorized company", async () => {
      (getCurrentUser as any).mockResolvedValue(sujithaUser);
      (db.workspaceMember.findMany as any).mockResolvedValue([
        { userId: sujithaUser.id, workspaceId: companyAId, status: "active", isActive: true }
      ]);

      const payload = {
        workspaceId: companyBId, // Sujitha attempting to submit for Absalkhan Private Limited
        reportDate: "2026-09-14",
        expenses: [],
        receipts: [],
        payments: [],
        bankBalances: [],
        cashBalance: { pettyCash: 0, total: 0 },
        summary: { totalExpenses: 0, totalReceipts: 0, totalPayments: 0, bankBalance: 0, pettyCashBalance: 0 },
        exchangeRate: 0.045
      };

      const request = new Request("http://localhost:3000/api/finance-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const response = await createFinanceReport(request);
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.message).toContain("permission to submit finance reports for this company");
    });
  });

  describe("Single Finance Report Direct Access & Mutations", () => {
    it("Scenario D: blocks direct GET of another company's report ID with 404", async () => {
      (getCurrentUser as any).mockResolvedValue(absalFinanceUser);
      (db.workspaceMember.findMany as any).mockResolvedValue([
        { userId: absalFinanceUser.id, workspaceId: companyBId, status: "active", isActive: true }
      ]);

      // Report belongs to Company A
      (db.financeReport.findUnique as any).mockResolvedValue({
        id: "rep-sujitha-123",
        workspaceId: companyAId,
        submittedByName: "Sujitha",
        reportDate: new Date()
      });

      const request = new Request("http://localhost:3000/api/finance-reports/rep-sujitha-123");
      const response = await getFinanceReportById(request, { params: Promise.resolve({ id: "rep-sujitha-123" }) });
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.success).toBe(false);
    });

    it("blocks cross-company report update with 403", async () => {
      (getCurrentUser as any).mockResolvedValue(absalFinanceUser);
      (db.workspaceMember.findMany as any).mockResolvedValue([
        { userId: absalFinanceUser.id, workspaceId: companyBId, status: "active", isActive: true }
      ]);

      (db.financeReport.findUnique as any).mockResolvedValue({
        id: "rep-sujitha-123",
        workspaceId: companyAId,
        submittedBy: sujithaUser.id,
        status: "pending"
      });

      const request = new Request("http://localhost:3000/api/finance-reports/rep-sujitha-123", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: companyAId,
          reportDate: "2026-09-14",
          summary: { description: "Malicious Edit" }
        })
      });

      const response = await updateFinanceReportById(request, { params: Promise.resolve({ id: "rep-sujitha-123" }) });
      expect(response.status).toBe(403);
    });

    it("blocks cross-company report deletion with 403", async () => {
      const foreignCeo = {
        id: "foreign-ceo",
        name: "Foreign CEO",
        role: "ceo",
        workspaceId: "foreign-ws"
      };

      (getCurrentUser as any).mockResolvedValue(foreignCeo);
      (db.workspaceMember.findMany as any).mockResolvedValue([
        { userId: foreignCeo.id, workspaceId: "foreign-ws", status: "active", isActive: true, workspace: { type: "ceo" } }
      ]);
      (db.workspace.findMany as any).mockResolvedValue([]);

      (db.financeReport.findUnique as any).mockResolvedValue({
        id: "rep-sujitha-123",
        workspaceId: companyAId,
        status: "pending"
      });

      const request = new Request("http://localhost:3000/api/finance-reports/rep-sujitha-123", { method: "DELETE" });
      const response = await deleteFinanceReportById(request, { params: Promise.resolve({ id: "rep-sujitha-123" }) });
      expect(response.status).toBe(403);
    });

    it("blocks cross-company report approval with 403", async () => {
      const foreignCeo = {
        id: "foreign-ceo",
        name: "Foreign CEO",
        role: "ceo",
        workspaceId: "foreign-ws"
      };

      (getCurrentUser as any).mockResolvedValue(foreignCeo);
      (db.workspaceMember.findMany as any).mockResolvedValue([
        { userId: foreignCeo.id, workspaceId: "foreign-ws", status: "active", isActive: true, workspace: { type: "ceo" } }
      ]);
      (db.workspace.findMany as any).mockResolvedValue([]);

      (db.financeReport.findUnique as any).mockResolvedValue({
        id: "rep-sujitha-123",
        workspaceId: companyAId,
        status: "pending"
      });

      const request = new Request("http://localhost:3000/api/finance-reports/rep-sujitha-123/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" })
      });

      const response = await approveFinanceReport(request, { params: Promise.resolve({ id: "rep-sujitha-123" }) });
      expect(response.status).toBe(403);
    });

    it("blocks cross-company PDF export with 404", async () => {
      (getCurrentUser as any).mockResolvedValue(absalFinanceUser);
      (db.workspaceMember.findMany as any).mockResolvedValue([
        { userId: absalFinanceUser.id, workspaceId: companyBId, status: "active", isActive: true }
      ]);

      (db.financeReport.findUnique as any).mockResolvedValue({
        id: "rep-sujitha-123",
        workspaceId: companyAId,
        reportDate: new Date(),
        submittedByName: "Sujitha",
        items: [],
        bankBalances: []
      });

      const request = new Request("http://localhost:3000/api/finance-reports/rep-sujitha-123/pdf");
      const response = await getFinanceReportPdf(request, { params: Promise.resolve({ id: "rep-sujitha-123" }) });
      expect(response.status).toBe(404);
    });
  });

  describe("Money Requests & Related Modules Isolation", () => {
    it("scopes Money Requests list to the selected active company workspace", async () => {
      (authorizeApi as any).mockResolvedValue({ authorized: true, user: ceoUser });
      (db.workspaceMember.findMany as any).mockResolvedValue(mockCeoMemberships);
      (db.workspace.findMany as any).mockResolvedValue(mockCeoOwnedCompanies);
      (db.moneyRequest.findMany as any).mockResolvedValue([]);

      const request = new Request(`http://localhost:3000/api/money-requests?workspaceId=${companyBId}`);
      const response = await getMoneyRequests(request);
      expect(response.status).toBe(200);

      expect(db.moneyRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workspaceId: companyBId
          })
        })
      );
    });

    it("scopes Petty Cash balance and transactions to selected company workspace", async () => {
      (getCurrentUser as any).mockResolvedValue(ceoUser);
      (db.workspaceMember.findMany as any).mockResolvedValue(mockCeoMemberships);
      (db.workspace.findMany as any).mockResolvedValue(mockCeoOwnedCompanies);
      (db.transaction.findMany as any).mockResolvedValue([]);

      const request = new Request(`http://localhost:3000/api/finance/petty-cash?workspaceId=${companyBId}`);
      const response = await getPettyCash(request);
      expect(response.status).toBe(200);

      expect(db.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workspaceId: companyBId,
            bankName: "Petty Cash"
          })
        })
      );
    });

    it("scopes Bank Accounts list to selected company workspace", async () => {
      (getCurrentUser as any).mockResolvedValue(ceoUser);
      (db.workspaceMember.findMany as any).mockResolvedValue(mockCeoMemberships);
      (db.workspace.findMany as any).mockResolvedValue(mockCeoOwnedCompanies);
      (db.bankAccount.findMany as any).mockResolvedValue([]);

      const request = new Request(`http://localhost:3000/api/finance/bank-accounts?workspaceId=${companyBId}`);
      const response = await getBankAccounts(request);
      expect(response.status).toBe(200);

      expect(db.bankAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workspaceId: companyBId,
            isActive: true
          })
        })
      );
    });

    it("scopes Finance Dashboard stats to selected company workspace", async () => {
      (getCurrentUser as any).mockResolvedValue(ceoUser);
      (db.workspaceMember.findMany as any).mockResolvedValue(mockCeoMemberships);
      (db.workspace.findMany as any).mockResolvedValue(mockCeoOwnedCompanies);
      (db.financeReport.findFirst as any).mockResolvedValue(null);
      (db.financeReport.count as any).mockResolvedValue(0);

      const request = new Request(`http://localhost:3000/api/finance-reports/dashboard?workspaceId=${companyBId}`);
      const response = await getFinanceDashboard(request);
      expect(response.status).toBe(200);

      expect(db.financeReport.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workspaceId: companyBId
          })
        })
      );
    });
  });
});
