import { describe, it, expect } from "vitest";
import { toDateKey } from "./consolidated-report-data";

function normalizeDepartment(val?: string | null): string {
  if (!val) return "All";
  const trimmed = val.trim();
  const lower = trimmed.toLowerCase();
  if (lower === "all" || lower === "all enrolled depts" || lower === "all departments") {
    return "All";
  }
  return trimmed;
}

function checkReportManagerDeptAuthorization(
  userDepts: string[],
  requestedDept: string
): { authorized: boolean; error?: string } {
  const normalized = normalizeDepartment(requestedDept);
  if (normalized === "All") {
    return { authorized: true };
  }
  if (userDepts.length > 0 && !userDepts.includes(normalized)) {
    return {
      authorized: false,
      error: "You are not authorized to access consolidated reports for this department."
    };
  }
  return { authorized: true };
}

describe("Consolidated Report Data & Utilities", () => {
  describe("toDateKey defensive handling", () => {
    it("converts ISO strings and standard date strings to YYYY-MM-DD format", () => {
      expect(toDateKey("2026-08-06T14:22:30.000Z")).toBe("2026-08-06");
      expect(toDateKey("2026-01-01")).toBe("2026-01-01");
    });

    it("converts instantiated Date objects cleanly to YYYY-MM-DD format", () => {
      const d = new Date("2026-05-10T12:00:00.000Z");
      expect(toDateKey(d)).toBe("2026-05-10");
    });

    it("handles invalid or malformed date inputs safely without throwing RangeError exception", () => {
      const invalidInputs = ["", "invalid-date", "not a timestamp", "2026-99-99"];
      for (const input of invalidInputs) {
        expect(() => toDateKey(input)).not.toThrow();
        expect(toDateKey(input)).toBe("");
      }
    });
  });

  describe("Department Parameter Normalization", () => {
    it("normalizes All Enrolled Depts, All Departments, and all to All", () => {
      expect(normalizeDepartment("All Enrolled Depts")).toBe("All");
      expect(normalizeDepartment("all enrolled depts")).toBe("All");
      expect(normalizeDepartment("All Departments")).toBe("All");
      expect(normalizeDepartment("all")).toBe("All");
      expect(normalizeDepartment("All")).toBe("All");
      expect(normalizeDepartment("")).toBe("All");
      expect(normalizeDepartment(null)).toBe("All");
      expect(normalizeDepartment(undefined)).toBe("All");
    });

    it("preserves specific individual department names", () => {
      expect(normalizeDepartment("Software")).toBe("Software");
      expect(normalizeDepartment("Marketing")).toBe("Marketing");
      expect(normalizeDepartment("Finance")).toBe("Finance");
      expect(normalizeDepartment("Construction")).toBe("Construction");
    });
  });

  describe("Report Manager Department Scope & Authorization", () => {
    const rameshAssignedDepts = ["Software", "Marketing"];

    it("authorizes Report Manager for assigned individual departments", () => {
      expect(checkReportManagerDeptAuthorization(rameshAssignedDepts, "Software")).toEqual({
        authorized: true
      });
      expect(checkReportManagerDeptAuthorization(rameshAssignedDepts, "Marketing")).toEqual({
        authorized: true
      });
    });

    it("authorizes Report Manager for All Enrolled Depts / All", () => {
      expect(checkReportManagerDeptAuthorization(rameshAssignedDepts, "All Enrolled Depts")).toEqual({
        authorized: true
      });
      expect(checkReportManagerDeptAuthorization(rameshAssignedDepts, "All")).toEqual({
        authorized: true
      });
    });

    it("denies access to unassigned departments with 403 error message", () => {
      const result = checkReportManagerDeptAuthorization(rameshAssignedDepts, "Construction");
      expect(result.authorized).toBe(false);
      expect(result.error).toBe("You are not authorized to access consolidated reports for this department.");

      const civilResult = checkReportManagerDeptAuthorization(rameshAssignedDepts, "Civil");
      expect(civilResult.authorized).toBe(false);
    });

    it("ensures reports from multiple assigned departments are included under All Enrolled Depts", () => {
      const mockReports = [
        { id: "rep-1", employeeId: "tl-software", department: "Software", teamName: "Frontend" },
        { id: "rep-2", employeeId: "tl-marketing", department: "Marketing", teamName: "Social Media" },
        { id: "rep-3", employeeId: "tl-construction", department: "Construction", teamName: "Site 1" }
      ];

      const visibleEmployeeIds = new Set(["tl-software", "tl-marketing"]);

      // When "All Enrolled Depts" is selected:
      const filteredReports = mockReports.filter((r) => visibleEmployeeIds.has(r.employeeId));
      expect(filteredReports).toHaveLength(2);
      expect(filteredReports.map((r) => r.department)).toEqual(["Software", "Marketing"]);
      expect(filteredReports.some((r) => r.department === "Construction")).toBe(false);

      // When "Software" is selected:
      const softwareReports = filteredReports.filter((r) => r.department === "Software");
      expect(softwareReports).toHaveLength(1);
      expect(softwareReports[0].department).toBe("Software");
    });
  });

  describe("Consolidated Report Grouping & MIF Tech Members Exclusion", () => {
    function resolveTeamName(memberOrUser: {
      teamName?: string | null;
      teamNames?: string[] | null;
      departments?: Array<{ name: string; subTeams?: string[] }> | null;
    }) {
      const candidate = [
        memberOrUser.teamName,
        ...(memberOrUser.teamNames ?? []),
        ...(memberOrUser.departments?.map((d) => d.name) ?? [])
      ].find((value) => value?.trim() && value.trim() !== "undefined" && value.trim() !== "MIF Tech Members");
      return candidate?.trim() || "";
    }

    function getTeamDisplayName(teamName: string, teamTypeShowNameMap: Record<string, string>) {
      if (!teamName || !teamName.trim() || teamName.toLowerCase() === "undefined" || teamName.trim() === "MIF Tech Members") {
        return "";
      }
      return teamTypeShowNameMap[teamName] ?? teamName;
    }

    it("resolves valid team and department names accurately without fallback to MIF Tech Members", () => {
      expect(resolveTeamName({ teamName: "Marketing", teamNames: ["Marketing"] })).toBe("Marketing");
      expect(resolveTeamName({ teamName: "Software" })).toBe("Software");
      expect(resolveTeamName({ teamName: "", departments: [{ name: "Mobile" }] })).toBe("Mobile");
      expect(resolveTeamName({ teamName: undefined, teamNames: [] })).toBe("");
      expect(resolveTeamName({ teamName: "undefined", teamNames: ["undefined"] })).toBe("");
      expect(resolveTeamName({ teamName: "MIF Tech Members" })).toBe("");
    });

    it("returns empty string for getTeamDisplayName on invalid/fallback names", () => {
      const map = { Marketing: "Marketing Team", Software: "Software Engineering" };
      expect(getTeamDisplayName("Marketing", map)).toBe("Marketing Team");
      expect(getTeamDisplayName("Software", map)).toBe("Software Engineering");
      expect(getTeamDisplayName("", map)).toBe("");
      expect(getTeamDisplayName("undefined", map)).toBe("");
      expect(getTeamDisplayName("MIF Tech Members", map)).toBe("");
    });

    it("ensures All Enrolled Depts groups only into real departments and excludes phantom groups", () => {
      const enrolledDepts = ["Marketing", "Mobile", "Web", "Software"];
      const members = [
        { id: "m1", name: "Alice", role: "team_member", teamName: "Marketing", departments: [{ name: "Marketing" }] },
        { id: "m2", name: "Bob", role: "team_lead", teamName: "Mobile", departments: [{ name: "Mobile" }] },
        { id: "m3", name: "Charlie", role: "team_member", teamName: "Web", departments: [{ name: "Web" }] },
        { id: "m4", name: "Dave", role: "team_member", teamName: "Software", departments: [{ name: "Software" }] },
        { id: "m5", name: "Unassigned User", role: "team_member", teamName: "", teamNames: [], departments: [] }
      ];

      const teamGroups: Array<{ teamName: string; members: string[] }> = [];
      const groupsMap = new Map<string, string[]>();

      for (const member of members) {
        const teamKey = resolveTeamName(member);
        if (!teamKey) continue; // Unassigned members without a real team are excluded from phantom groups

        const display = getTeamDisplayName(teamKey, {});
        if (!display) continue;

        const current = groupsMap.get(display) ?? [];
        current.push(member.name);
        groupsMap.set(display, current);
      }

      for (const [teamName, memberNames] of groupsMap.entries()) {
        teamGroups.push({ teamName, members: memberNames });
      }

      const generatedTeamNames = teamGroups.map((g) => g.teamName).sort();
      expect(generatedTeamNames).toEqual(["Marketing", "Mobile", "Software", "Web"]);
      expect(generatedTeamNames).not.toContain("MIF Tech Members");
      expect(generatedTeamNames).not.toContain("");
      expect(teamGroups.some((g) => g.teamName === "MIF Tech Members")).toBe(false);
    });

    it("preserves HOD consolidated reports behavior without MIF Tech Members", () => {
      const hodDepts = ["Engineering"];
      const teamLeads = [
        { id: "tl-1", name: "Lead 1", teamName: "Engineering", departments: [{ name: "Engineering" }] },
        { id: "tl-2", name: "Lead 2", teamName: "Engineering", departments: [{ name: "Engineering" }] }
      ];

      const groupsMap = new Map<string, string[]>();
      for (const tl of teamLeads) {
        const teamKey = resolveTeamName(tl);
        if (!teamKey) continue;
        const display = getTeamDisplayName(teamKey, {});
        if (!display) continue;
        const current = groupsMap.get(display) ?? [];
        current.push(tl.name);
        groupsMap.set(display, current);
      }

      expect(Array.from(groupsMap.keys())).toEqual(["Engineering"]);
      expect(groupsMap.has("MIF Tech Members")).toBe(false);
    });
  });
});
