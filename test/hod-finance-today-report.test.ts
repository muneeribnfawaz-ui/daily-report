import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn()
}));

vi.mock("@/lib/db", () => ({
  default: {
    workspaceMember: {
      findMany: vi.fn()
    },
    teamType: {
      findMany: vi.fn()
    },
    dailyReport: {
      findMany: vi.fn()
    },
    financeReport: {
      findMany: vi.fn()
    }
  }
}));

import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { GET as getTeamLeadsToday } from "@/app/api/report-manager/team-leads-today/route";

describe("HOD Create Report - Finance Team Lead Report Inclusion", () => {
  const mockHodUser = {
    id: "hod-user-1",
    name: "Finance HOD",
    role: "hod",
    workspaceId: "ws-company-a",
    departments: [{ name: "Finance", subTeams: [] }]
  };

  const mockTeamLeadMembers = [
    {
      userId: "tl-fin-1",
      user: { id: "tl-fin-1", name: "Healan", isDeleted: false },
      teamName: "Accounts",
      teamNames: ["Accounts"],
      departments: [{ name: "Finance", subTeams: [] }],
      role: "team_lead",
      workspaceId: "ws-company-a",
      status: "active",
      isActive: true
    },
    {
      userId: "tl-sw-1",
      user: { id: "tl-sw-1", name: "Guna", isDeleted: false },
      teamName: "Core Dev",
      teamNames: ["Core Dev"],
      departments: [{ name: "Software", subTeams: [] }],
      role: "team_lead",
      workspaceId: "ws-company-a",
      status: "active",
      isActive: true
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentUser as any).mockResolvedValue(mockHodUser);
    (db.teamType.findMany as any).mockResolvedValue([
      { name: "Accounts", showName: "Accounts", department: "Finance", subTeams: [] },
      { name: "Core Dev", showName: "Core Dev", department: "Software", subTeams: [] }
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("1. HOD + Finance Team Lead + submitted Finance Report for today => report is returned/displayed", async () => {
    (db.workspaceMember.findMany as any).mockResolvedValue([mockTeamLeadMembers[0]]);
    (db.dailyReport.findMany as any).mockResolvedValue([]);
    (db.financeReport.findMany as any).mockResolvedValue([
      {
        id: "fin-rep-1",
        workspaceId: "ws-company-a",
        submittedBy: "tl-fin-1",
        submittedByName: "Healan",
        reportDate: new Date(),
        description: "Today finance reconciliation and voucher check.",
        status: "pending",
        items: [
          { particulars: "Office Supplies", amountINR: 5000, type: "expense", description: "Stationery" },
          { particulars: "Client Payment", amountINR: 25000, type: "receipt", description: "Invoice #101" }
        ],
        bankBalances: [
          { bankName: "HDFC Bank", openingBalance: 50000, receipts: 25000, payments: 5000, closingBalance: 70000 }
        ]
      }
    ]);

    const req = new Request("http://localhost:3000/api/report-manager/team-leads-today?workspaceId=ws-company-a");
    const res = await getTeamLeadsToday(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);

    const tlData = json.data[0];
    expect(tlData.name).toBe("Healan");
    expect(tlData.department).toBe("Finance");
    expect(tlData.todayReport).not.toBeNull();
    expect(tlData.todayReport.id).toBe("fin-rep-1");
    expect(tlData.todayReport.completedWork).toContain("Today finance reconciliation");
    expect(tlData.todayReport.completedWork).toContain("Total Receipts: ₹25,000");
    expect(tlData.todayReport.completedWork).toContain("Total Expenses: ₹5,000");
    expect(tlData.todayReport.completedWork).toContain("Closing Balance: ₹70,000");
    expect(tlData.todayReport.attachmentLink).toBe("/finance/fin-rep-1");
    expect(tlData.todayReport.status).toBe("pending");
  });

  it("2. No Finance Report => todayReport is null ('No report submitted for today')", async () => {
    (db.workspaceMember.findMany as any).mockResolvedValue([mockTeamLeadMembers[0]]);
    (db.dailyReport.findMany as any).mockResolvedValue([]);
    (db.financeReport.findMany as any).mockResolvedValue([]);

    const req = new Request("http://localhost:3000/api/report-manager/team-leads-today?workspaceId=ws-company-a");
    const res = await getTeamLeadsToday(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].name).toBe("Healan");
    expect(json.data[0].todayReport).toBeNull();
  });

  it("3. Finance Report from another workspace => NOT visible (workspace isolation)", async () => {
    // When querying with workspaceId ws-company-a, workspaceMember and financeReport queries enforce workspaceId filter
    (db.workspaceMember.findMany as any).mockImplementation(async (args: any) => {
      expect(args.where.workspaceId).toBe("ws-company-a");
      return [mockTeamLeadMembers[0]];
    });
    (db.dailyReport.findMany as any).mockResolvedValue([]);
    (db.financeReport.findMany as any).mockImplementation(async (args: any) => {
      expect(args.where.workspaceId).toBe("ws-company-a");
      // Simulate that in company-a there is no report, only in company-b
      return [];
    });

    const req = new Request("http://localhost:3000/api/report-manager/team-leads-today?workspaceId=ws-company-a");
    const res = await getTeamLeadsToday(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data[0].todayReport).toBeNull();
  });

  it("4. Existing normal Daily Report behavior remains unchanged", async () => {
    (getCurrentUser as any).mockResolvedValue({
      id: "hod-sw-1",
      name: "Software HOD",
      role: "hod",
      workspaceId: "ws-company-a",
      departments: [{ name: "Software", subTeams: [] }]
    });

    (db.workspaceMember.findMany as any).mockResolvedValue([mockTeamLeadMembers[1]]);
    (db.dailyReport.findMany as any).mockResolvedValue([
      {
        id: "rep-sw-1",
        employeeId: "tl-sw-1",
        workspaceId: "ws-company-a",
        reportDate: new Date(),
        completedWork: "Created APIs",
        pendingWork: "Testing",
        blockers: "None",
        requiredClarification: "",
        attachmentLink: "https://example.com",
        dailyMeetingUpdate: "",
        status: "submitted",
        approvalItems: [],
        workPlans: [],
        materialUtilizations: [],
        tomorrowWorkPlans: [],
        marketingSelfItems: [],
        marketingClientItems: []
      }
    ]);
    (db.financeReport.findMany as any).mockResolvedValue([]);

    const req = new Request("http://localhost:3000/api/report-manager/team-leads-today?workspaceId=ws-company-a");
    const res = await getTeamLeadsToday(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].name).toBe("Guna");
    expect(json.data[0].todayReport).not.toBeNull();
    expect(json.data[0].todayReport.id).toBe("rep-sw-1");
    expect(json.data[0].todayReport.completedWork).toBe("Created APIs");
    expect(json.data[0].todayReport.attachmentLink).toBe("https://example.com");
  });
});
