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

describe("HOD Consolidated Reports - Full Regression Scenarios", () => {
  const sampleUsers = [
    { id: "user-hod", name: "Bagath Khan", role: "hod", isDeleted: false },
    { id: "user-tl-sw", name: "Software TL", role: "team_lead", isDeleted: false },
    { id: "user-tl-mkt", name: "Marketing TL", role: "team_lead", isDeleted: false },
    { id: "user-tl-const", name: "Construction TL", role: "team_lead", isDeleted: false },
    { id: "user-tl-mobile", name: "Mobile TL", role: "team_lead", isDeleted: false },
    { id: "user-tm-mobile", name: "Mobile Dev", role: "team_member", isDeleted: false }
  ];

  const sampleMembers = [
    {
      userId: "user-hod",
      role: "hod",
      status: "active",
      isActive: true,
      workspaceId: "ws-company-1",
      user: { id: "user-hod", name: "Bagath Khan", role: "hod" },
      departments: [
        { name: "Software", subTeams: [] },
        { name: "Marketing", subTeams: [] },
        { name: "Construction", subTeams: [] }
      ]
    },
    {
      userId: "user-tl-sw",
      role: "team_lead",
      teamName: "Core Dev",
      status: "active",
      isActive: true,
      workspaceId: "ws-company-1",
      user: { id: "user-tl-sw", name: "Software TL", role: "team_lead" },
      departments: [{ name: "Software", subTeams: [] }]
    },
    {
      userId: "user-tl-mkt",
      role: "team_lead",
      teamName: "SEO",
      status: "active",
      isActive: true,
      workspaceId: "ws-company-1",
      user: { id: "user-tl-mkt", name: "Marketing TL", role: "team_lead" },
      departments: [{ name: "Marketing", subTeams: [] }]
    },
    {
      userId: "user-tl-const",
      role: "team_lead",
      teamName: "Civil Works",
      status: "active",
      isActive: true,
      workspaceId: "ws-company-1",
      user: { id: "user-tl-const", name: "Construction TL", role: "team_lead" },
      departments: [{ name: "Construction", subTeams: [] }]
    },
    {
      userId: "user-tl-mobile",
      role: "team_lead",
      teamName: "Mobile team",
      status: "active",
      isActive: true,
      workspaceId: "ws-company-1",
      user: { id: "user-tl-mobile", name: "Mobile TL", role: "team_lead" },
      departments: [{ name: "Mobile", subTeams: [] }]
    },
    {
      userId: "user-tm-mobile",
      role: "team_member",
      teamName: "Mobile team",
      status: "active",
      isActive: true,
      workspaceId: "ws-company-1",
      user: { id: "user-tm-mobile", name: "Mobile Dev", role: "team_member" },
      departments: [{ name: "Mobile", subTeams: [] }]
    }
  ];

  const sampleReports = [
    {
      id: "rep-hod-sw",
      employeeId: "user-hod",
      name: "Bagath Khan",
      teamName: "Software",
      reportType: "Daily Update",
      reportDate: new Date("2026-09-14T00:00:00.000Z"),
      completedWork: "Software sprint report by HOD",
      pendingWork: "",
      blockers: "",
      requiredClarification: "",
      dailyMeetingUpdate: "",
      status: "submitted"
    },
    {
      id: "rep-hod-mkt",
      employeeId: "user-hod",
      name: "Bagath Khan",
      teamName: "Marketing",
      reportType: "Daily Update",
      reportDate: new Date("2026-09-14T00:00:00.000Z"),
      completedWork: "Marketing campaign review by HOD",
      pendingWork: "",
      blockers: "",
      requiredClarification: "",
      dailyMeetingUpdate: "",
      status: "submitted"
    },
    {
      id: "rep-hod-const",
      employeeId: "user-hod",
      name: "Bagath Khan",
      teamName: "Construction",
      reportType: "Daily Update",
      reportDate: new Date("2026-09-14T00:00:00.000Z"),
      completedWork: "Construction site audit by HOD",
      pendingWork: "",
      blockers: "",
      requiredClarification: "",
      dailyMeetingUpdate: "",
      status: "submitted"
    },
    {
      id: "rep-tl-sw",
      employeeId: "user-tl-sw",
      name: "Software TL",
      teamName: "Core Dev",
      reportType: "Daily Update",
      reportDate: new Date("2026-09-14T00:00:00.000Z"),
      completedWork: "Backend APIs delivered",
      pendingWork: "",
      blockers: "",
      requiredClarification: "",
      dailyMeetingUpdate: "",
      status: "submitted"
    },
    {
      id: "rep-tl-mkt",
      employeeId: "user-tl-mkt",
      name: "Marketing TL",
      teamName: "SEO",
      reportType: "Daily Update",
      reportDate: new Date("2026-09-14T00:00:00.000Z"),
      completedWork: "SEO keywords ranking improvement",
      pendingWork: "",
      blockers: "",
      requiredClarification: "",
      dailyMeetingUpdate: "",
      status: "submitted"
    },
    {
      id: "rep-tl-const",
      employeeId: "user-tl-const",
      name: "Construction TL",
      teamName: "Civil Works",
      reportType: "Daily Update",
      reportDate: new Date("2026-09-14T00:00:00.000Z"),
      completedWork: "Concrete pouring stage 2 complete",
      pendingWork: "",
      blockers: "",
      requiredClarification: "",
      dailyMeetingUpdate: "",
      status: "submitted"
    },
    {
      id: "rep-mobile-tl",
      employeeId: "user-tl-mobile",
      name: "Mobile TL",
      teamName: "Mobile team",
      reportType: "Daily Update",
      reportDate: new Date("2026-09-14T00:00:00.000Z"),
      completedWork: "Mobile iOS build release",
      pendingWork: "",
      blockers: "",
      requiredClarification: "",
      dailyMeetingUpdate: "",
      status: "submitted"
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    (db.workspaceMember.findMany as any).mockImplementation(async (args: any) => {
      let mems = sampleMembers;
      if (args?.where?.workspaceId && args.where.workspaceId !== "all") {
        mems = mems.filter((m) => m.workspaceId === args.where.workspaceId);
      }
      return mems;
    });
    (db.user.findMany as any).mockResolvedValue(sampleUsers);
    (db.user.findFirst as any).mockImplementation(async (args: any) => {
      const u = sampleUsers.find((user) => user.name === args?.where?.name);
      if (!u) return null;
      const mems = sampleMembers.filter((m) => m.userId === u.id);
      return { ...u, workspaceMembers: mems };
    });
    (db.teamType.findMany as any).mockResolvedValue([
      { name: "Core Dev", showName: "Core Dev", department: "Software", subTeams: [] },
      { name: "SEO", showName: "SEO", department: "Marketing", subTeams: [] },
      { name: "Civil Works", showName: "Civil Works", department: "Construction", subTeams: [] },
      { name: "Mobile team", showName: "Mobile team", department: "Mobile", subTeams: [] }
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Scenario A & B: HOD allocated to Software + Marketing + Construction shows only those depts, Mobile Team does NOT appear", async () => {
    (db.dailyReport.findMany as any).mockImplementation(async (args: any) => {
      let filtered = sampleReports;
      const andConditions = args?.where?.AND || (args?.where ? [args.where] : []);
      for (const cond of andConditions) {
        if (cond.employeeId?.in) {
          filtered = filtered.filter((r) => cond.employeeId.in.includes(r.employeeId));
        }
        if (cond.teamName?.in) {
          filtered = filtered.filter((r) => cond.teamName.in.includes(r.teamName));
        }
      }
      return filtered;
    });

    const result = await getConsolidatedReportDetail(
      "2026-09-14",
      "Bagath Khan",
      "hod",
      null,
      "operations",
      "All",
      "ws-company-1"
    );

    const allGroupTeamNames = result.teamGroups.map((g) => g.teamName);
    const allReportIds = [
      ...result.teamGroups.flatMap((g) => g.reports.map((r) => r.id)),
      ...(result.departmentSections?.flatMap((d) => [
        ...d.hodReports.map((r) => r.id),
        ...d.reportManagerReports.map((r) => r.id),
        ...d.teamGroups.flatMap((g) => g.reports.map((r) => r.id))
      ]) ?? [])
    ];

    // Software, Marketing, Construction reports MUST be included
    expect(allReportIds).toContain("rep-hod-sw");
    expect(allReportIds).toContain("rep-hod-mkt");
    expect(allReportIds).toContain("rep-hod-const");
    expect(allReportIds).toContain("rep-tl-sw");
    expect(allReportIds).toContain("rep-tl-mkt");
    expect(allReportIds).toContain("rep-tl-const");

    // Unrelated Mobile team report MUST NOT be included anywhere
    expect(allReportIds).not.toContain("rep-mobile-tl");
    expect(allGroupTeamNames).not.toContain("Mobile team");

    // Department sections must strictly match assigned departments
    expect(result.departmentSections).toBeDefined();
    const deptNames = result.departmentSections!.map((d) => d.department);
    expect(deptNames).toEqual(["Software", "Marketing", "Construction"]);
    expect(deptNames).not.toContain("Mobile");
  });

  it("Scenario C: Software selected → only Software reports appear", async () => {
    (db.dailyReport.findMany as any).mockImplementation(async (args: any) => {
      let filtered = sampleReports;
      const andConditions = args?.where?.AND || (args?.where ? [args.where] : []);
      for (const cond of andConditions) {
        if (cond.employeeId?.in) {
          filtered = filtered.filter((r) => cond.employeeId.in.includes(r.employeeId));
        }
        if (cond.teamName?.in) {
          filtered = filtered.filter((r) => cond.teamName.in.includes(r.teamName));
        }
      }
      return filtered;
    });

    const result = await getConsolidatedReportDetail(
      "2026-09-14",
      "Bagath Khan",
      "hod",
      null,
      "operations",
      "Software",
      "ws-company-1"
    );

    const allReportIds = [
      ...result.teamGroups.flatMap((g) => g.reports.map((r) => r.id)),
      ...(result.departmentSections?.flatMap((d) => [
        ...d.hodReports.map((r) => r.id),
        ...d.reportManagerReports.map((r) => r.id),
        ...d.teamGroups.flatMap((g) => g.reports.map((r) => r.id))
      ]) ?? [])
    ];

    expect(allReportIds).toContain("rep-hod-sw");
    expect(allReportIds).toContain("rep-tl-sw");
    expect(allReportIds).not.toContain("rep-hod-mkt");
    expect(allReportIds).not.toContain("rep-hod-const");
    expect(allReportIds).not.toContain("rep-mobile-tl");

    expect(result.departmentSections).toHaveLength(1);
    expect(result.departmentSections![0].department).toBe("Software");
  });

  it("Scenario D: Marketing selected → only Marketing reports appear", async () => {
    (db.dailyReport.findMany as any).mockImplementation(async (args: any) => {
      let filtered = sampleReports;
      const andConditions = args?.where?.AND || (args?.where ? [args.where] : []);
      for (const cond of andConditions) {
        if (cond.employeeId?.in) {
          filtered = filtered.filter((r) => cond.employeeId.in.includes(r.employeeId));
        }
        if (cond.teamName?.in) {
          filtered = filtered.filter((r) => cond.teamName.in.includes(r.teamName));
        }
      }
      return filtered;
    });

    const result = await getConsolidatedReportDetail(
      "2026-09-14",
      "Bagath Khan",
      "hod",
      null,
      "operations",
      "Marketing",
      "ws-company-1"
    );

    const allReportIds = [
      ...result.teamGroups.flatMap((g) => g.reports.map((r) => r.id)),
      ...(result.departmentSections?.flatMap((d) => [
        ...d.hodReports.map((r) => r.id),
        ...d.reportManagerReports.map((r) => r.id),
        ...d.teamGroups.flatMap((g) => g.reports.map((r) => r.id))
      ]) ?? [])
    ];

    expect(allReportIds).toContain("rep-hod-mkt");
    expect(allReportIds).toContain("rep-tl-mkt");
    expect(allReportIds).not.toContain("rep-hod-sw");
    expect(allReportIds).not.toContain("rep-hod-const");
    expect(allReportIds).not.toContain("rep-mobile-tl");

    expect(result.departmentSections).toHaveLength(1);
    expect(result.departmentSections![0].department).toBe("Marketing");
  });

  it("Scenario E: Construction selected → only Construction reports appear", async () => {
    (db.dailyReport.findMany as any).mockImplementation(async (args: any) => {
      let filtered = sampleReports;
      const andConditions = args?.where?.AND || (args?.where ? [args.where] : []);
      for (const cond of andConditions) {
        if (cond.employeeId?.in) {
          filtered = filtered.filter((r) => cond.employeeId.in.includes(r.employeeId));
        }
        if (cond.teamName?.in) {
          filtered = filtered.filter((r) => cond.teamName.in.includes(r.teamName));
        }
      }
      return filtered;
    });

    const result = await getConsolidatedReportDetail(
      "2026-09-14",
      "Bagath Khan",
      "hod",
      null,
      "operations",
      "Construction",
      "ws-company-1"
    );

    const allReportIds = [
      ...result.teamGroups.flatMap((g) => g.reports.map((r) => r.id)),
      ...(result.departmentSections?.flatMap((d) => [
        ...d.hodReports.map((r) => r.id),
        ...d.reportManagerReports.map((r) => r.id),
        ...d.teamGroups.flatMap((g) => g.reports.map((r) => r.id))
      ]) ?? [])
    ];

    expect(allReportIds).toContain("rep-hod-const");
    expect(allReportIds).toContain("rep-tl-const");
    expect(allReportIds).not.toContain("rep-hod-sw");
    expect(allReportIds).not.toContain("rep-hod-mkt");
    expect(allReportIds).not.toContain("rep-mobile-tl");

    expect(result.departmentSections).toHaveLength(1);
    expect(result.departmentSections![0].department).toBe("Construction");
  });

  it("Scenario F: HOD's own reports appear under each correct department and marked as hod", async () => {
    (db.dailyReport.findMany as any).mockImplementation(async (args: any) => {
      let filtered = sampleReports;
      const andConditions = args?.where?.AND || (args?.where ? [args.where] : []);
      for (const cond of andConditions) {
        if (cond.employeeId?.in) {
          filtered = filtered.filter((r) => cond.employeeId.in.includes(r.employeeId));
        }
      }
      return filtered;
    });

    const result = await getConsolidatedReportDetail(
      "2026-09-14",
      "Bagath Khan",
      "hod",
      null,
      "operations",
      "All",
      "ws-company-1"
    );

    expect(result.departmentSections).toBeDefined();
    expect(result.departmentSections).toHaveLength(3);

    const swSec = result.departmentSections!.find((d) => d.department === "Software");
    const mktSec = result.departmentSections!.find((d) => d.department === "Marketing");
    const constSec = result.departmentSections!.find((d) => d.department === "Construction");

    expect(swSec).toBeDefined();
    expect(mktSec).toBeDefined();
    expect(constSec).toBeDefined();

    expect(swSec!.hodReports).toHaveLength(1);
    expect(swSec!.hodReports[0].id).toBe("rep-hod-sw");
    expect(swSec!.hodReports[0].employeeRole).toBe("hod");

    expect(mktSec!.hodReports).toHaveLength(1);
    expect(mktSec!.hodReports[0].id).toBe("rep-hod-mkt");
    expect(mktSec!.hodReports[0].employeeRole).toBe("hod");

    expect(constSec!.hodReports).toHaveLength(1);
    expect(constSec!.hodReports[0].id).toBe("rep-hod-const");
    expect(constSec!.hodReports[0].employeeRole).toBe("hod");
  });

  it("Scenario G: Cross-company isolation remains intact", async () => {
    const result = await getConsolidatedReportDetail(
      "2026-09-14",
      "Bagath Khan",
      "hod",
      null,
      "operations",
      "All",
      "ws-company-other"
    );

    // When workspaceId is ws-company-other, no member exists, so empty result returned
    expect(result.reportCount).toBe(0);
    expect(result.teamGroups).toHaveLength(0);
    expect(result.departmentSections).toHaveLength(0);
  });
});
