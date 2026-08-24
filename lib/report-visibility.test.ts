import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { getVisibleReportEmployeeIds } from "./report-visibility";
import WorkspaceMember from "../models/WorkspaceMember";

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
    }
  ];

  beforeEach(() => {
    const mockQuery = {
      populate: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(mockMembers)
    };
    vi.spyOn(WorkspaceMember, "find").mockImplementation(() => mockQuery as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null for executive roles (admin, ceo, hod) signifying complete visibility", async () => {
    expect(await getVisibleReportEmployeeIds({ id: "1", name: "Executive 1", role: "admin" })).toBeNull();
    expect(await getVisibleReportEmployeeIds({ id: "2", name: "Executive 2", role: "ceo" })).toBeNull();
    expect(await getVisibleReportEmployeeIds({ id: "3", name: "Executive 3", role: "hod" })).toBeNull();
  });

  it("restricts report_manager visibility strictly to Software and Marketing (Digital) departments", async () => {
    const ids = await getVisibleReportEmployeeIds({ id: "rm-1", name: "Report Manager", role: "report_manager" });
    expect(ids).toBeDefined();
    if (ids) {
      expect(ids).toContain("emp-101"); // Software
      expect(ids).toContain("emp-102"); // Marketing Digital
      expect(ids).toContain("emp-105"); // Software Architecture Lead
      expect(ids).not.toContain("emp-103"); // Marketing Field (Not Digital)
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
