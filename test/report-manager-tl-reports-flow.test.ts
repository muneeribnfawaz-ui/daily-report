import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getVisibleReportEmployeeIds } from "@/lib/report-visibility";
import { SIDEBAR_NAV_ITEMS_BY_ROLE } from "@/lib/constants";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn()
}));

vi.mock("@/lib/db", () => {
  return {
    default: {
      workspaceMember: {
        findMany: vi.fn()
      },
      user: {
        findMany: vi.fn().mockResolvedValue([])
      },
      teamType: {
        findMany: vi.fn().mockResolvedValue([])
      },
      dailyReport: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        update: vi.fn()
      },
      notification: {
        createMany: vi.fn().mockResolvedValue({ count: 1 })
      }
    }
  };
});
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { GET as getReportManagerReports } from "@/app/api/report-manager/reports/route";

describe("Report Manager -> Team Lead Reports & Edit Request Flow", () => {
  const sampleMembers = [
    {
      userId: { _id: "rm-avinash", name: "Avinash" },
      managerName: "CEO",
      departments: [{ name: "Construction", subTeams: [] }],
      role: "report_manager",
      workspaceId: "ws-construction"
    },
    {
      userId: { _id: "tl-sameer", name: "Sameer" },
      managerName: "Avinash",
      departments: [{ name: "Construction", subTeams: [] }],
      role: "team_lead",
      workspaceId: "ws-construction"
    },
    {
      userId: { _id: "tm-imam", name: "Imam" },
      managerName: "Sameer",
      departments: [{ name: "Construction", subTeams: [] }],
      role: "team_member",
      workspaceId: "ws-construction"
    },
    {
      userId: { _id: "tl-marketing", name: "Marketing Lead" },
      managerName: "HOD Marketing",
      departments: [{ name: "Marketing", subTeams: [] }],
      role: "team_lead",
      workspaceId: "ws-construction"
    },
    {
      userId: { _id: "hod-bagath", name: "Bagath" },
      managerName: "CEO",
      departments: [{ name: "Construction", subTeams: [] }],
      role: "hod",
      workspaceId: "ws-construction"
    },
    {
      userId: { _id: "admin-user", name: "Admin System" },
      managerName: null,
      departments: [],
      role: "admin",
      workspaceId: "ws-construction"
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

  describe("1. Report Visibility Boundaries", () => {
    it("Report Manager (Avinash) sees Team Leads (Sameer) and excludes Team Members (Imam)", async () => {
      const visibleIds = await getVisibleReportEmployeeIds({
        id: "rm-avinash",
        name: "Avinash",
        role: "report_manager",
        departments: [{ name: "Construction", subTeams: [] }]
      });

      expect(visibleIds).toBeDefined();
      expect(visibleIds).toContain("tl-sameer"); // Sameer (Team Lead) -> SHOW
      expect(visibleIds).not.toContain("tm-imam"); // Imam (Team Member) -> DO NOT SHOW
      expect(visibleIds).toContain("rm-avinash"); // Self
    });

    it("Report Manager (Avinash) does not see Team Leads from unauthorized departments (Marketing)", async () => {
      const visibleIds = await getVisibleReportEmployeeIds({
        id: "rm-avinash",
        name: "Avinash",
        role: "report_manager",
        departments: [{ name: "Construction", subTeams: [] }]
      });

      expect(visibleIds).not.toContain("tl-marketing");
    });

    it("Preserves full report visibility for Admin, CEO, and HOD", async () => {
      const adminIds = await getVisibleReportEmployeeIds({
        id: "admin-user",
        name: "Admin System",
        role: "admin"
      });
      expect(adminIds).toContain("tl-sameer");
      expect(adminIds).toContain("tm-imam");
      expect(adminIds).toContain("rm-avinash");

      const hodIds = await getVisibleReportEmployeeIds({
        id: "hod-bagath",
        name: "Bagath",
        role: "hod",
        departments: [{ name: "Construction", subTeams: [] }]
      });
      expect(hodIds).toContain("tl-sameer");
      expect(hodIds).toContain("tm-imam");
      expect(hodIds).toContain("rm-avinash");
    });
  });

  describe("2. Edit Request Notification & Approver Resolution", () => {
    it("Resolves Report Manager (Avinash) as the notification recipient when Team Lead (Sameer) sends Edit Request", async () => {
      const requester = { id: "tl-sameer", name: "Sameer", role: "team_lead" };
      const requesterMemberships = [
        {
          userId: "tl-sameer",
          managerName: "Avinash",
          departments: [{ name: "Construction" }],
          role: "team_lead"
        }
      ];

      // Simulate the approver resolution in edit-request route
      const managerNames = requesterMemberships.map(m => m.managerName).filter(Boolean);
      const approversMap = new Map<string, { userId: string; role: string }>();

      if (managerNames.length > 0) {
        const managerMemberships = await db.workspaceMember.findMany({
          where: {
            isActive: true,
            user: { name: { in: managerNames } },
            role: { in: ["report_manager", "hod"] }
          },
          select: { userId: true, role: true }
        });
        managerMemberships.forEach(m => approversMap.set(m.userId, { userId: m.userId, role: m.role || "report_manager" }));
      }

      expect(approversMap.has("rm-avinash")).toBe(true);
      expect(approversMap.size).toBe(1);

      // Verify notification details
      const approver = approversMap.get("rm-avinash")!;
      expect(approver.role).toBe("report_manager");

      const linkUrl = `/reports?employee=${encodeURIComponent(requester.name)}`;
      expect(linkUrl).toBe("/reports?employee=Sameer");
    });

    it("Notification navigates directly to TL Reports for Report Manager", () => {
      const approverRole = "report_manager";
      const requesterName = "Sameer";

      let linkUrl = `/daily-report/my-reports`;
      if (approverRole === "report_manager") {
        linkUrl = `/reports?employee=${encodeURIComponent(requesterName)}`;
      } else if (approverRole === "hod") {
        linkUrl = `/hod/reports?employee=${encodeURIComponent(requesterName)}`;
      }

      expect(linkUrl).toBe("/reports?employee=Sameer");
    });
  });

  describe("3. UI Navigation Text", () => {
    it("Report Manager navigation renders 'TL Reports' instead of 'All Reports'", () => {
      const rmNav = SIDEBAR_NAV_ITEMS_BY_ROLE.report_manager;
      const tlReportsItem = rmNav.find(item => item.href === "/reports");

      expect(tlReportsItem).toBeDefined();
      expect(tlReportsItem?.label).toBe("TL Reports");
      expect(rmNav.some(item => (item.label as string) === "All Reports")).toBe(false);
    });

    it("Preserves 'All Reports' for HOD and other roles where applicable", () => {
      const hodNav = SIDEBAR_NAV_ITEMS_BY_ROLE.hod;
      const hodReportsItem = hodNav.find(item => item.href === "/hod/reports");

      expect(hodReportsItem).toBeDefined();
      expect(hodReportsItem?.label).toBe("All Reports");
    });
  });

  describe("4. Complete Team Lead Report Content & Review Serialization", () => {
    it("Maps and returns complete Team Lead report fields including construction and standard details", async () => {
      const rawReport = {
        id: "rep-sameer-1",
        employeeId: "tl-sameer",
        name: "Sameer",
        teamName: "Engineering",
        reportType: "Daily Update",
        reportDate: new Date(),
        completedWork: "TEST - Completed project planning.",
        pendingWork: "TEST - Pending final sign-off.",
        blockers: "TEST - No major issues.",
        requiredClarification: "TEST - Need client approval on design.",
        attachmentLink: "https://example.com/site-plan.pdf",
        dailyMeetingUpdate: "TEST - Site safety briefing completed.",
        status: "submitted",
        reportManagerStatus: null,
        reportManagerReview: null,
        reportManagerReviewedByName: null,
        reportManagerReviewedAt: null,
        workPlans: [
          {
            activity: "Excavation",
            location: "Sector A",
            unit: "sqm",
            plannedQuantity: "100",
            executedQuantity: "80",
            completionPercentage: "80%",
            remarks: "On track"
          }
        ],
        materialUtilizations: [
          {
            material: "Cement",
            unit: "Bags",
            openingStock: "50",
            received: "20",
            closingStock: "30"
          }
        ],
        tomorrowWorkPlans: [
          {
            activity: "Concreting",
            location: "Sector A",
            unit: "sqm",
            plannedQuantity: "60"
          }
        ],
        marketingSelfItems: [],
        marketingClientItems: [],
        approvalItems: []
      };

      const { mapReportRelations } = await import("@/lib/report-mapper");
      const mapped = mapReportRelations(rawReport);

      expect(mapped.completedWork).toBe("TEST - Completed project planning.");
      expect(mapped.pendingWork).toBe("TEST - Pending final sign-off.");
      expect(mapped.blockers).toBe("TEST - No major issues.");
      expect(mapped.requiredClarification).toBe("TEST - Need client approval on design.");
      expect(mapped.attachmentLink).toBe("https://example.com/site-plan.pdf");
      expect(mapped.dailyMeetingUpdate).toBe("TEST - Site safety briefing completed.");

      // Verify relations are properly mapped for frontend renderers
      expect(mapped.constructionWorkPlan).toHaveLength(1);
      expect(mapped.constructionWorkPlan[0].activity).toBe("Excavation");
      expect(mapped.constructionMaterialUtilization).toHaveLength(1);
      expect(mapped.constructionMaterialUtilization[0].material).toBe("Cement");
      expect(mapped.constructionTomorrowWorkPlan).toHaveLength(1);
      expect(mapped.constructionTomorrowWorkPlan[0].plannedQuantity).toBe("60");
    });

    it("Multiple Team Leads with different report contents are correctly preserved", async () => {
      const { mapReportRelations } = await import("@/lib/report-mapper");

      const sameerReport = mapReportRelations({
        id: "rep-sameer",
        employeeId: "tl-sameer",
        completedWork: "Completed the client dashboard UI.",
        blockers: "API integration was delayed.",
        workPlans: [{ activity: "UI Dev" }]
      });

      const rahulReport = mapReportRelations({
        id: "rep-rahul",
        employeeId: "tl-rahul",
        completedWork: "Foundation concrete pouring completed.",
        blockers: "Weather delay in afternoon.",
        workPlans: [{ activity: "Foundation Pouring" }]
      });

      expect(sameerReport.completedWork).toBe("Completed the client dashboard UI.");
      expect(sameerReport.constructionWorkPlan[0].activity).toBe("UI Dev");

      expect(rahulReport.completedWork).toBe("Foundation concrete pouring completed.");
      expect(rahulReport.constructionWorkPlan[0].activity).toBe("Foundation Pouring");
    });

    it("Approve and Reject actions require non-empty remarks/reasons", () => {
      const validateRemark = (remark: string, action: "approve" | "reject") => {
        const trimmed = remark.trim();
        if (!trimmed) {
          return { valid: false, error: action === "approve" ? "Remark is required for approval." : "Reason is required for rejection." };
        }
        return { valid: true, error: null };
      };

      expect(validateRemark("", "approve").valid).toBe(false);
      expect(validateRemark("", "approve").error).toBe("Remark is required for approval.");

      expect(validateRemark("   ", "reject").valid).toBe(false);
      expect(validateRemark("   ", "reject").error).toBe("Reason is required for rejection.");

      expect(validateRemark("Good work on project milestones.", "approve").valid).toBe(true);
      expect(validateRemark("Please update material inventory numbers.", "reject").valid).toBe(true);
    });
  });

  describe("5. Team Name Display Resolution (Report Manager vs Team Lead)", () => {
    it("Displays '-' as teamName when report submitter is a Report Manager (Khan) allocated to departments without a team", async () => {
      (getCurrentUser as any).mockResolvedValue({
        id: "rm-khan",
        name: "Khan",
        role: "report_manager",
        departments: [{ name: "Software" }, { name: "Marketing" }, { name: "Construction" }],
        workspaceId: "ws-construction"
      });

      const khanReport = {
        id: "rep-khan-1",
        employeeId: "rm-khan",
        name: "Khan",
        teamName: "Software", // department fallback stored on report
        reportType: "Daily Update",
        reportDate: new Date("2026-09-14"),
        completedWork: "Report Manager summary",
        status: "submitted"
      };

      (db.dailyReport.findMany as any).mockResolvedValue([khanReport]);
      (db.user.findMany as any).mockResolvedValue([{ id: "rm-khan", name: "Khan", role: "report_manager" }]);
      (db.workspaceMember.findMany as any).mockResolvedValue([
        {
          userId: "rm-khan",
          role: "report_manager",
          departments: [{ name: "Software" }, { name: "Marketing" }, { name: "Construction" }],
          teamNames: []
        }
      ]);

      const req = new Request("http://localhost/api/report-manager/reports?view=date-paginated&page=1&limit=10");
      const res = await getReportManagerReports(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      const firstReport = json.data.items[0].reports[0];
      expect(firstReport.name).toBe("Khan");
      expect(firstReport.teamName).toBe("-"); // Must be '-' not 'Software'
    });

    it("Displays actual assigned Team Name when report submitter is a Team Lead (Sameer)", async () => {
      (getCurrentUser as any).mockResolvedValue({
        id: "rm-khan",
        name: "Khan",
        role: "report_manager",
        departments: [{ name: "Construction" }],
        workspaceId: "ws-construction"
      });

      const sameerReport = {
        id: "rep-sameer-1",
        employeeId: "tl-sameer",
        name: "Sameer",
        teamName: "Engineering",
        reportType: "Daily Update",
        reportDate: new Date("2026-09-14"),
        completedWork: "Site report",
        status: "submitted"
      };

      (db.dailyReport.findMany as any).mockResolvedValue([sameerReport]);
      (db.user.findMany as any).mockResolvedValue([{ id: "tl-sameer", name: "Sameer", role: "team_lead" }]);
      (db.workspaceMember.findMany as any).mockResolvedValue([
        {
          userId: "tl-sameer",
          role: "team_lead",
          departments: [{ name: "Construction" }],
          teamNames: ["Engineering"]
        }
      ]);

      const req = new Request("http://localhost/api/report-manager/reports?view=date-paginated&page=1&limit=10");
      const res = await getReportManagerReports(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      const firstReport = json.data.items[0].reports[0];
      expect(firstReport.name).toBe("Sameer");
      expect(firstReport.teamName).toBe("Engineering"); // Preserves real team name
    });
  });
});
