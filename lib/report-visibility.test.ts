import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { getVisibleReportEmployeeIds } from "./report-visibility";
import User from "../models/User";

describe("Report Visibility & Hierarchical Access Boundaries", () => {
  const mockUsers = [
    {
      _id: "emp-101",
      name: "Alice Software Tech",
      managerName: "Bob Lead",
      teamName: "Software",
      departments: [{ name: "Software", subTeams: ["Frontend"] }]
    },
    {
      _id: "emp-102",
      name: "Carol Marketing Digital",
      managerName: "Dave Lead",
      teamName: "Marketing",
      departments: [{ name: "Marketing", subTeams: ["Digital", "Content"] }]
    },
    {
      _id: "emp-103",
      name: "Eve Marketing Field",
      managerName: "Dave Lead",
      teamName: "Marketing",
      departments: [{ name: "Marketing", subTeams: ["Field", "Events"] }]
    },
    {
      _id: "emp-104",
      name: "Frank Finance",
      managerName: "HOD Finance",
      teamName: "Finance",
      departments: [{ name: "Finance", subTeams: ["Accounting"] }]
    },
    {
      _id: "emp-105",
      name: "Bob Lead",
      managerName: "CEO",
      teamName: "Software",
      departments: [{ name: "Software", subTeams: ["Architecture"] }]
    }
  ];

  beforeEach(() => {
    vi.spyOn(User, "find").mockImplementation(() => ({
      lean: vi.fn().mockResolvedValue(mockUsers)
    }) as any);
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
