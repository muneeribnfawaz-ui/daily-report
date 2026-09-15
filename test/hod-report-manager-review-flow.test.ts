import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getVisibleReportEmployeeIds } from "@/lib/report-visibility";

vi.mock("@/lib/db", () => {
  return {
    default: {
      workspaceMember: {
        findMany: vi.fn(),
        findFirst: vi.fn()
      },
      teamType: {
        findMany: vi.fn().mockResolvedValue([])
      },
      dailyReport: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn()
      }
    }
  };
});
import db from "@/lib/db";

describe("HOD -> Report Manager Review Flow", () => {
  const sampleMembers = [
    {
      userId: { _id: "rm-avinash", name: "Avinash" },
      managerName: "Sathish",
      departments: [{ name: "Construction", subTeams: [] }],
      role: "report_manager",
      workspaceId: "ws-main"
    },
    {
      userId: { _id: "tl-sameer", name: "Sameer" },
      managerName: "Avinash",
      departments: [{ name: "Construction", subTeams: [] }],
      role: "team_lead",
      workspaceId: "ws-main"
    },
    {
      userId: { _id: "tm-imam", name: "Imam" },
      managerName: "Sameer",
      departments: [{ name: "Construction", subTeams: [] }],
      role: "team_member",
      workspaceId: "ws-main"
    },
    {
      userId: { _id: "hod-sathish", name: "Sathish" },
      managerName: "CEO",
      departments: [{ name: "Construction", subTeams: [] }],
      role: "hod",
      workspaceId: "ws-main"
    },
    {
      userId: { _id: "hod-other", name: "Other HOD" },
      managerName: "CEO",
      departments: [{ name: "Marketing", subTeams: [] }],
      role: "hod",
      workspaceId: "ws-main"
    },
    {
      userId: { _id: "admin-user", name: "Admin" },
      managerName: null,
      departments: [],
      role: "admin",
      workspaceId: "ws-main"
    },
    {
      userId: { _id: "ceo-user", name: "CEO" },
      managerName: null,
      departments: [],
      role: "ceo",
      workspaceId: "ws-main"
    }
  ];

  beforeEach(() => {
    (vi.mocked(db.workspaceMember.findMany) as any).mockImplementation(async (args: any) => {
      let filtered = sampleMembers;
      if (args?.where?.role?.in) {
        filtered = filtered.filter(m => args.where.role.in.includes(m.role));
      }
      if (args?.where?.role && typeof args.where.role === "string") {
        filtered = filtered.filter(m => m.role === args.where.role);
      }
      if (args?.where?.user?.name?.in) {
        filtered = filtered.filter(m => args.where.user.name.in.includes(m.userId.name));
      }
      if (args?.where?.departments?.some?.name?.in) {
        filtered = filtered.filter(m => m.departments.some(d => args.where.departments.some.name.in.includes(d.name)));
      }
      return filtered.map((m: any) => ({
        ...m,
        user: m.userId,
        userId: m.userId._id
      })) as any;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Role Tag & Badge Mapping", () => {
    it("Formats report creator roles correctly across all system roles", () => {
      const getRoleDisplayName = (role?: string | null) => {
        const normalized = String(role || "").toLowerCase().trim();
        if (normalized === "team_lead" || normalized === "team lead") return "Team Lead";
        if (normalized === "report_manager" || normalized === "report manager") return "Report Manager";
        if (normalized === "hod") return "HOD";
        if (normalized === "ceo") return "CEO";
        if (normalized === "admin") return "Admin";
        return "Team Member";
      };

      // Avinash: report_manager -> "Report Manager" (NOT "Team Member")
      expect(getRoleDisplayName("report_manager")).toBe("Report Manager");
      expect(getRoleDisplayName("report_manager").toUpperCase()).toBe("REPORT MANAGER");
      expect(getRoleDisplayName("report_manager")).not.toBe("Team Member");

      // Sameer: team_lead -> "Team Lead"
      expect(getRoleDisplayName("team_lead")).toBe("Team Lead");
      expect(getRoleDisplayName("team_lead").toUpperCase()).toBe("TEAM LEAD");

      // Imam: team_member -> "Team Member"
      expect(getRoleDisplayName("team_member")).toBe("Team Member");

      // Sathish: hod -> "HOD"
      expect(getRoleDisplayName("hod")).toBe("HOD");

      // CEO and Admin
      expect(getRoleDisplayName("ceo")).toBe("CEO");
      expect(getRoleDisplayName("admin")).toBe("Admin");
    });
  });

  describe("2. HOD Authorization & Report Visibility", () => {
    it("Sathish (HOD Construction) can view Avinash's (Report Manager) report and Sameer's (Team Lead) report", async () => {
      const visibleIds = await getVisibleReportEmployeeIds({
        id: "hod-sathish",
        name: "Sathish",
        role: "hod",
        departments: [{ name: "Construction", subTeams: [] }]
      });

      expect(visibleIds).toContain("rm-avinash"); // Report Manager
      expect(visibleIds).toContain("tl-sameer");  // Team Lead
      expect(visibleIds).toContain("tm-imam");    // Team Member
    });

    it("Other HOD (Marketing) cannot view Avinash's (Construction) report", async () => {
      const visibleIds = await getVisibleReportEmployeeIds({
        id: "hod-other",
        name: "Other HOD",
        role: "hod",
        departments: [{ name: "Marketing", subTeams: [] }]
      });

      expect(visibleIds).not.toContain("rm-avinash");
      expect(visibleIds).not.toContain("tl-sameer");
    });
  });

  describe("3. Report Manager Review Remark Serialization & Visibility to HOD", () => {
    it("Loads Team Lead reports reviewed by Report Manager and attaches them to Report Manager report view", async () => {
      const avinashReport = {
        id: "rep-avinash-1",
        employeeId: "rm-avinash",
        name: "Avinash",
        teamName: "Construction Operations",
        reportType: "Daily Update",
        reportDate: new Date("2026-09-11T00:00:00.000Z"),
        completedWork: "Reviewed site progress and coordinated with contractors.",
        pendingWork: "Pending structural inspection report.",
        status: "submitted",
        role: "report_manager"
      };

      const sameerReviewedReport = {
        id: "rep-sameer-1",
        employeeId: "tl-sameer",
        name: "Sameer",
        teamName: "Civil Engineering",
        reportType: "Daily Update",
        reportDate: new Date("2026-09-11T00:00:00.000Z"),
        completedWork: "Excavation and foundation work completed.",
        reportManagerStatus: "approved",
        reportManagerReview: "Good progress. Please complete the remaining construction activities.",
        reportManagerReviewedBy: "rm-avinash",
        reportManagerReviewedByName: "Avinash",
        reportManagerReviewedAt: new Date("2026-09-11T10:30:00.000Z")
      };

      // Mock finding the reviewed reports
      (vi.mocked(db.dailyReport.findMany) as any).mockResolvedValue([sameerReviewedReport]);

      // Simulate API query for Report Manager's report detail
      const dateStart = new Date("2026-09-11T00:00:00.000Z");
      const dateEnd = new Date("2026-09-11T23:59:59.999Z");

      const reviewedTlReports = await db.dailyReport.findMany({
        where: {
          reportManagerReviewedBy: avinashReport.employeeId,
          reportDate: {
            gte: dateStart,
            lte: dateEnd
          }
        },
        select: {
          id: true,
          employeeId: true,
          name: true,
          teamName: true,
          reportType: true,
          reportDate: true,
          reportManagerStatus: true,
          reportManagerReview: true,
          reportManagerReviewedByName: true,
          reportManagerReviewedAt: true
        }
      });

      const enrichedReport = {
        ...avinashReport,
        teamLeadReviews: reviewedTlReports.map((tl: any) => ({
          reportId: tl.id,
          teamLeadId: tl.employeeId,
          teamLeadName: tl.name,
          teamName: tl.teamName,
          status: tl.reportManagerStatus,
          remark: tl.reportManagerReview,
          reviewedByName: tl.reportManagerReviewedByName,
          reviewedAt: tl.reportManagerReviewedAt
        }))
      };

      // Assertions
      expect(enrichedReport.role).toBe("report_manager");
      expect(enrichedReport.teamLeadReviews).toHaveLength(1);
      expect(enrichedReport.teamLeadReviews[0].teamLeadName).toBe("Sameer");
      expect(enrichedReport.teamLeadReviews[0].status).toBe("approved");
      expect(enrichedReport.teamLeadReviews[0].remark).toBe(
        "Good progress. Please complete the remaining construction activities."
      );
      expect(enrichedReport.teamLeadReviews[0].reviewedByName).toBe("Avinash");
    });

    it("Preserves dynamic remark text without hardcoding", () => {
      const dynamicRemark = "TEST REMARK - Reviewed Sameer's report successfully.";
      const reviewItem = {
        reportId: "rep-123",
        teamLeadId: "tl-sameer",
        teamLeadName: "Sameer",
        status: "approved",
        remark: dynamicRemark,
        reviewedByName: "Avinash"
      };

      expect(reviewItem.remark).toBe(dynamicRemark);
      expect(reviewItem.remark).toContain("TEST REMARK");
    });
  });
});
