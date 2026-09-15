import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { getVisibleReportEmployeeIds } from "./report-visibility";

vi.mock("@/lib/db", () => {
  return {
    default: {
      workspaceMember: {
        findMany: vi.fn()
      },
      workspace: {
        findMany: vi.fn().mockResolvedValue([])
      },
      teamType: {
        findMany: vi.fn().mockResolvedValue([])
      }
    }
  };
});
import db from "@/lib/db";

describe("Report Visibility & Hierarchical Access Boundaries", () => {
  const mockMembers = [
    {
      userId: { _id: "emp-101", name: "Alice Software Tech" },
      managerName: "Bob Lead",
      departments: [{ name: "Software", subTeams: ["Frontend"] }],
      role: "team_member",
      workspaceId: "ws-123"
    },
    {
      userId: { _id: "emp-102", name: "Carol Marketing Digital" },
      managerName: "Dave Lead",
      departments: [{ name: "Marketing", subTeams: ["Digital", "Content"] }],
      role: "team_member",
      workspaceId: "ws-123"
    },
    {
      userId: { _id: "emp-103", name: "Eve Marketing Field" },
      managerName: "Dave Lead",
      departments: [{ name: "Marketing", subTeams: ["Field", "Events"] }],
      role: "team_member",
      workspaceId: "ws-123"
    },
    {
      userId: { _id: "emp-104", name: "Frank Finance" },
      managerName: "HOD Finance",
      departments: [{ name: "Finance", subTeams: ["Accounting"] }],
      role: "finance_team",
      workspaceId: "ws-123"
    },
    {
      userId: { _id: "emp-105", name: "Bob Lead" },
      managerName: "CEO",
      departments: [{ name: "Software", subTeams: ["Architecture"] }],
      role: "team_lead",
      workspaceId: "ws-123"
    },
    {
      userId: { _id: "emp-106", name: "Absal Lead" },
      managerName: "HOD Marketing",
      departments: [{ name: "Marketing", subTeams: ["Physical"] }],
      role: "team_lead",
      workspaceId: "ws-123"
    },
    {
      userId: { _id: "rm-1", name: "Ramesh Report Manager" },
      managerName: "CEO",
      departments: [
        { name: "Software", subTeams: [] },
        { name: "Marketing", subTeams: ["Digital", "Physical"] }
      ],
      role: "report_manager",
      workspaceId: "ws-123"
    },
    {
      userId: { _id: "rm-2", name: "Marketing RM" },
      managerName: "CEO",
      departments: [{ name: "Marketing", subTeams: [] }],
      role: "report_manager",
      workspaceId: "ws-123"
    }
  ];

  beforeEach(() => {
    vi.mocked(db.workspaceMember.findMany).mockResolvedValue(
      mockMembers.map((m: any) => ({
        ...m,
        user: m.userId,
        userId: m.userId._id
      })) as any
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns visible employee IDs for executive roles (admin, ceo, hod)", async () => {
    const adminIds = await getVisibleReportEmployeeIds({ id: "1", name: "Executive 1", role: "admin" });
    expect(adminIds).toBeDefined();
    expect(adminIds).toContain("emp-101");
    expect(adminIds).toContain("emp-102");

    const ceoIds = await getVisibleReportEmployeeIds({ id: "2", name: "Executive 2", role: "ceo" });
    expect(ceoIds).toBeDefined();
    expect(ceoIds).toContain("emp-101");
    expect(ceoIds).toContain("emp-102");
  });

  it("dynamically respects assigned departments and subTeams for report_manager role (Team Leads only)", async () => {
    // RM assigned Software (all subteams) and Marketing (Digital, Physical)
    const ids = await getVisibleReportEmployeeIds({
      id: "rm-1",
      name: "Ramesh Report Manager",
      role: "report_manager",
      departments: [
        { name: "Software", subTeams: [] },
        { name: "Marketing", subTeams: ["Digital", "Physical"] }
      ]
    });
    expect(ids).toBeDefined();
    if (ids) {
      expect(ids).toContain("rm-1"); // Self
      expect(ids).toContain("emp-105"); // Software Architecture Lead (Team Lead)
      expect(ids).toContain("emp-106"); // Marketing Physical Lead (Team Lead)
      expect(ids).not.toContain("emp-101"); // Software Frontend Member (Team Member - hidden)
      expect(ids).not.toContain("emp-102"); // Marketing Digital Member (Team Member - hidden)
      expect(ids).not.toContain("emp-103"); // Marketing Field Member (Team Member - hidden)
      expect(ids).not.toContain("emp-104"); // Finance (Wrong department and role)
    }
  });

  it("allows all subTeams when report_manager has no subTeam restrictions for an assigned department (Team Leads only)", async () => {
    const ids = await getVisibleReportEmployeeIds({
      id: "rm-2",
      name: "Marketing RM",
      role: "report_manager",
      departments: [{ name: "Marketing", subTeams: [] }]
    });
    expect(ids).toBeDefined();
    if (ids) {
      expect(ids).toContain("emp-106"); // Marketing Physical (Team Lead)
      expect(ids).not.toContain("emp-102"); // Marketing Digital (Team Member - hidden)
      expect(ids).not.toContain("emp-103"); // Marketing Field (Team Member - hidden)
      expect(ids).not.toContain("emp-101"); // Software
      expect(ids).not.toContain("emp-104"); // Finance
    }
  });

  it("includes self, team peers, and direct hierarchical reports for standard leads and team members", async () => {
    const ids = await getVisibleReportEmployeeIds({
      id: "emp-105",
      name: "Bob Lead",
      role: "team_lead",
      teamName: "Software"
    });
    expect(ids).toBeDefined();
    if (ids) {
      expect(ids).toContain("emp-105"); // Self
      expect(ids).toContain("emp-101"); // Direct report & same team
      expect(ids).not.toContain("emp-104"); // Unrelated Finance employee
      expect(ids).not.toContain("emp-103"); // Unrelated Marketing employee
    }
  });
});
