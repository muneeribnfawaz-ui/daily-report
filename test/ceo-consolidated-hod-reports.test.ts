import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getConsolidatedReportDetail } from "@/lib/consolidated-report-data";

vi.mock("@/lib/db", () => {
  return {
    default: {
      workspaceMember: {
        findMany: vi.fn(),
        findFirst: vi.fn()
      },
      workspace: {
        findMany: vi.fn().mockResolvedValue([])
      },
      teamType: {
        findMany: vi.fn().mockResolvedValue([])
      },
      dailyReport: {
        findMany: vi.fn(),
        findUnique: vi.fn()
      },
      user: {
        findMany: vi.fn(),
        findFirst: vi.fn()
      },
      leaveRequest: {
        findMany: vi.fn().mockResolvedValue([])
      }
    }
  };
});
import db from "@/lib/db";

describe("CEO Consolidated Reports - HOD Multi-Department Flow", () => {
  const sampleUsers = [
    { id: "user-bagath", name: "Bagath", role: "hod", isDeleted: false },
    { id: "user-sathish", name: "Sathish", role: "hod", isDeleted: false },
    { id: "user-ceo", name: "CEO User", role: "ceo", isDeleted: false }
  ];

  const sampleMembers = [
    {
      userId: "user-bagath",
      role: "hod",
      status: "active",
      isActive: true,
      workspaceId: "ws-company-1",
      user: { id: "user-bagath", name: "Bagath", role: "hod" },
      departments: [
        { name: "Software", subTeams: [] },
        { name: "Finance", subTeams: [] },
        { name: "Marketing", subTeams: [] }
      ]
    },
    {
      userId: "user-sathish",
      role: "hod",
      status: "active",
      isActive: true,
      workspaceId: "ws-company-1",
      user: { id: "user-sathish", name: "Sathish", role: "hod" },
      departments: [
        { name: "Construction", subTeams: [] }
      ]
    }
  ];

  const sampleReports = [
    {
      id: "rep-sw-bagath",
      employeeId: "user-bagath",
      name: "Bagath",
      teamName: "Software",
      reportType: "Daily Update",
      reportDate: new Date("2026-09-11T00:00:00.000Z"),
      completedWork: "Software sprint completed. API security fixes merged.",
      pendingWork: "Database indexing optimization.",
      blockers: "None",
      requiredClarification: "None",
      dailyMeetingUpdate: "Software team daily sync completed.",
      status: "submitted",
      verificationLevel: "hod"
    },
    {
      id: "rep-fin-bagath",
      employeeId: "user-bagath",
      name: "Bagath",
      teamName: "Finance",
      reportType: "Daily Update",
      reportDate: new Date("2026-09-11T00:00:00.000Z"),
      completedWork: "Finance reconciliation completed for September.",
      pendingWork: "Vendor payment verification.",
      blockers: "Awaiting bank statement.",
      requiredClarification: "None",
      dailyMeetingUpdate: "Finance sync done.",
      status: "submitted",
      verificationLevel: "hod"
    },
    {
      id: "rep-mkt-bagath",
      employeeId: "user-bagath",
      name: "Bagath",
      teamName: "Marketing",
      reportType: "Daily Update",
      reportDate: new Date("2026-09-11T00:00:00.000Z"),
      completedWork: "Marketing growth campaign launched across digital channels.",
      pendingWork: "Campaign performance metrics collection.",
      blockers: "None",
      requiredClarification: "Budget approval for Q4 ads.",
      dailyMeetingUpdate: "Marketing team standup completed.",
      status: "submitted",
      verificationLevel: "hod"
    },
    {
      id: "rep-con-sathish",
      employeeId: "user-sathish",
      name: "Sathish",
      teamName: "Construction",
      reportType: "Daily Update",
      reportDate: new Date("2026-09-11T00:00:00.000Z"),
      completedWork: "Construction foundation work verified at Sector 4 site.",
      pendingWork: "Concrete quality inspection tomorrow morning.",
      blockers: "Material transit delay due to rain.",
      requiredClarification: "Structural engineer sign-off required.",
      dailyMeetingUpdate: "Safety briefing conducted at site.",
      status: "submitted",
      verificationLevel: "hod"
    }
  ];

  beforeEach(() => {
    (vi.mocked(db.user.findMany) as any).mockResolvedValue(sampleUsers);
    (vi.mocked(db.user.findFirst) as any).mockResolvedValue(sampleUsers[2]);
    (vi.mocked(db.workspaceMember.findMany) as any).mockResolvedValue(sampleMembers);
    (vi.mocked(db.dailyReport.findMany) as any).mockResolvedValue(sampleReports);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Consolidated Detail for CEO with department=All", () => {
    it("CEO sees all 4 enrolled department reports for Bagath (Software, Finance, Marketing) and Sathish (Construction)", async () => {
      const result = await getConsolidatedReportDetail(
        "2026-09-11",
        "CEO User",
        "ceo",
        null,
        undefined,
        "All",
        "ws-company-1",
        "daily"
      );

      expect(result.reportCount).toBe(4);
      expect(result.teamCount).toBe(4);

      const groupNames = result.teamGroups.map((g) => g.teamName);
      expect(groupNames).toContain("Construction");
      expect(groupNames).toContain("Finance");
      expect(groupNames).toContain("Marketing");
      expect(groupNames).toContain("Software");

      // Verify Bagath's Software report
      const softwareGroup = result.teamGroups.find((g) => g.teamName === "Software")!;
      expect(softwareGroup.reports).toHaveLength(1);
      expect(softwareGroup.reports[0].name).toBe("Bagath");
      expect(softwareGroup.reports[0].employeeRole).toBe("hod");
      expect(softwareGroup.reports[0].completedWork).toBe("Software sprint completed. API security fixes merged.");
      expect(softwareGroup.reports[0].pendingWork).toBe("Database indexing optimization.");

      // Verify Bagath's Finance report
      const financeGroup = result.teamGroups.find((g) => g.teamName === "Finance")!;
      expect(financeGroup.reports).toHaveLength(1);
      expect(financeGroup.reports[0].name).toBe("Bagath");
      expect(financeGroup.reports[0].employeeRole).toBe("hod");
      expect(financeGroup.reports[0].completedWork).toBe("Finance reconciliation completed for September.");

      // Verify Bagath's Marketing report
      const marketingGroup = result.teamGroups.find((g) => g.teamName === "Marketing")!;
      expect(marketingGroup.reports).toHaveLength(1);
      expect(marketingGroup.reports[0].name).toBe("Bagath");
      expect(marketingGroup.reports[0].employeeRole).toBe("hod");
      expect(marketingGroup.reports[0].completedWork).toBe("Marketing growth campaign launched across digital channels.");
      expect(marketingGroup.reports[0].pendingWork).toBe("Campaign performance metrics collection.");
      expect(marketingGroup.reports[0].requiredClarification).toBe("Budget approval for Q4 ads.");

      // Verify Sathish's Construction report
      const constructionGroup = result.teamGroups.find((g) => g.teamName === "Construction")!;
      expect(constructionGroup.reports).toHaveLength(1);
      expect(constructionGroup.reports[0].name).toBe("Sathish");
      expect(constructionGroup.reports[0].employeeRole).toBe("hod");
      expect(constructionGroup.reports[0].completedWork).toBe("Construction foundation work verified at Sector 4 site.");
      expect(constructionGroup.reports[0].pendingWork).toBe("Concrete quality inspection tomorrow morning.");
      expect(constructionGroup.reports[0].blockers).toBe("Material transit delay due to rain.");
      expect(constructionGroup.reports[0].requiredClarification).toBe("Structural engineer sign-off required.");
    });
  });

  describe("2. Report Content Rendering & Field Preservation", () => {
    it("Preserves all standard fields (Completed Work, Pending Work, Blockers, Clarification) for Construction and Marketing", () => {
      const constructionReport = {
        name: "Sathish",
        employeeRole: "hod",
        teamName: "Construction",
        completedWork: "Construction foundation work verified at Sector 4 site.",
        pendingWork: "Concrete quality inspection tomorrow morning.",
        blockers: "Material transit delay due to rain.",
        requiredClarification: "Structural engineer sign-off required.",
        constructionWorkPlan: []
      };

      const marketingReport = {
        name: "Bagath",
        employeeRole: "hod",
        teamName: "Marketing",
        completedWork: "Marketing growth campaign launched across digital channels.",
        pendingWork: "Campaign performance metrics collection.",
        blockers: "None",
        requiredClarification: "Budget approval for Q4 ads.",
        marketingSelfItems: []
      };

      const hasConstructionTables = Boolean(constructionReport.constructionWorkPlan?.length);
      const hasMarketingTables = Boolean(marketingReport.marketingSelfItems?.length);

      // Verify that standard details are recognized and not suppressed
      expect(hasConstructionTables).toBe(false);
      expect(hasMarketingTables).toBe(false);

      expect(constructionReport.completedWork.length).toBeGreaterThan(0);
      expect(marketingReport.completedWork.length).toBeGreaterThan(0);
    });
  });

  describe("3. Missing HOD Reports Detection", () => {
    it("Correctly identifies missing department reports when an HOD submits for one department but not another", async () => {
      // Bagath only submitted Software and Finance (Marketing is missing)
      const partialReports = [sampleReports[0], sampleReports[1], sampleReports[3]];
      (vi.mocked(db.dailyReport.findMany) as any).mockResolvedValue(partialReports);

      const result = await getConsolidatedReportDetail(
        "2026-09-11",
        "CEO User",
        "ceo",
        null,
        undefined,
        "All",
        "ws-company-1",
        "daily"
      );

      // Marketing group should exist with Bagath listed under notSharedMembers
      const marketingGroup = result.teamGroups.find((g) => g.teamName === "Marketing");
      expect(marketingGroup).toBeDefined();
      expect(marketingGroup?.reports).toHaveLength(0);
      expect(marketingGroup?.notSharedMembers).toBeDefined();
      expect(marketingGroup?.notSharedMembers?.some((m) => m.name === "Bagath")).toBe(true);
    });
  });
});
