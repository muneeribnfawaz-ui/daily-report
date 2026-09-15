import { describe, it, expect } from "vitest";
import { adminCreateUserSchema, clientCreateUserSchema } from "@/lib/validation";

describe("Add Employee Team Type & Manager Dependency", () => {
  // Helper to test manager filtering by department
  function filterManagersByDepartment(
    managers: Array<{
      _id: string;
      name: string;
      role?: string;
      departments?: Array<{ name: string; subTeams?: string[] }> | null;
      teamNames?: string[] | null;
      teamName?: string | null;
    }>,
    selectedDepartment: string,
    teamOptions: Array<{ name: string; showName?: string; department?: string }>
  ) {
    return managers.filter((manager) => {
      if (manager.departments && manager.departments.length > 0) {
        const hasDept = manager.departments.some(
          (d) => selectedDepartment.toLowerCase() === d.name.toLowerCase()
        );
        if (hasDept) return true;
      }
      const managerTeams = [manager.teamName, ...(manager.teamNames ?? [])].filter(Boolean) as string[];
      if (managerTeams.length > 0) {
        const hasMatchingTeam = managerTeams.some((tn) => {
          const matchedType = teamOptions.find(
            (t) =>
              t.name.toLowerCase() === tn.toLowerCase() ||
              (t.showName && t.showName.toLowerCase() === tn.toLowerCase())
          );
          return (
            matchedType?.department &&
            matchedType.department.toLowerCase() === selectedDepartment.toLowerCase()
          );
        });
        if (hasMatchingTeam) return true;
      }
      return false;
    });
  }

  // Helper to derive available team options based on role, manager, and department
  function deriveAvailableTeamOptions({
    selectedRole,
    currentManagerName,
    selectedManagers,
    teamOptions,
    selectedDepartment
  }: {
    selectedRole: string;
    currentManagerName: string;
    selectedManagers: Array<{
      _id: string;
      name: string;
      role?: string;
      teamName?: string | null;
      teamNames?: string[] | null;
    }>;
    teamOptions: Array<{ _id: string; name: string; showName?: string; department?: string }>;
    selectedDepartment: string;
  }) {
    if (selectedRole === "hod" || selectedRole === "report_manager" || selectedRole === "ceo") {
      return [];
    }

    if (selectedRole === "team_member") {
      if (!currentManagerName) {
        return [];
      }
      const selectedManager = selectedManagers.find((m) => m.name === currentManagerName);
      const managerTeams = [
        selectedManager?.teamName,
        ...(selectedManager?.teamNames ?? [])
      ].filter(Boolean) as string[];

      if (managerTeams.length > 0) {
        const normalized = managerTeams.map((t) => t.trim().toLowerCase());
        const filtered = teamOptions.filter(
          (team) =>
            normalized.includes(team.name.trim().toLowerCase()) ||
            (team.showName && normalized.includes(team.showName.trim().toLowerCase()))
        );
        if (filtered.length > 0) return filtered;
        return managerTeams.map((name) => ({
          _id: name,
          name: name,
          showName: name
        }));
      }

      if (
        selectedManager?.role === "hod" ||
        selectedManager?.role === "report_manager" ||
        selectedManager?.role === "admin" ||
        selectedManager?.role === "ceo"
      ) {
        return teamOptions.filter(
          (t) => t.department?.toLowerCase() === selectedDepartment.toLowerCase()
        );
      }

      return [];
    }

    if (selectedRole === "team_lead") {
      return teamOptions.filter(
        (t) => t.department?.toLowerCase() === selectedDepartment.toLowerCase()
      );
    }

    return teamOptions;
  }

  function getTeamTypeEmptyMessage({
    selectedRole,
    currentManagerName
  }: {
    selectedRole: string;
    currentManagerName: string;
  }) {
    if (selectedRole === "team_member") {
      if (!currentManagerName) {
        return "Select a manager first to view available team types.";
      }
      return "No team types available for the selected manager.";
    }
    if (selectedRole === "team_lead") {
      return "No team types available for the selected department.";
    }
    return "No team types available.";
  }

  const sampleTeamTypes = [
    { _id: "tt-1", name: "CIVIL_SITE", showName: "Civil Site Works", department: "Construction" },
    { _id: "tt-2", name: "STRUCTURAL", showName: "Structural Design", department: "Construction" },
    { _id: "tt-3", name: "FRONTEND", showName: "Frontend Web", department: "Software" },
    { _id: "tt-4", name: "BACKEND", showName: "Backend Services", department: "Software" }
  ];

  const sampleTeamLeads = [
    {
      _id: "lead-1",
      name: "Ramesh TL Construction",
      role: "team_lead",
      departments: [{ name: "Construction" }],
      teamNames: ["CIVIL_SITE", "STRUCTURAL"],
      teamName: "CIVIL_SITE"
    },
    {
      _id: "lead-2",
      name: "Suresh TL Software",
      role: "team_lead",
      departments: [{ name: "Software" }],
      teamNames: ["FRONTEND"],
      teamName: "FRONTEND"
    },
    {
      _id: "lead-3",
      name: "NoTeams Lead Construction",
      role: "team_lead",
      departments: [{ name: "Construction" }],
      teamNames: [],
      teamName: null
    }
  ];

  describe("1. Manager Required Validation", () => {
    it("fails validation when managerName is empty for team_member", () => {
      const invalidPayload = {
        firstName: "John",
        lastName: "Doe",
        phone: "9876543210",
        empID: "EMP101",
        email: "john@example.com",
        password: "Password123!",
        confirmPassword: "Password123!",
        role: "team_member",
        workspaceId: "ws-1",
        departments: [{ name: "Construction", subTeams: [] }],
        managerName: "",
        teamNames: ["CIVIL_SITE"],
        roleTypes: ["Civil Engineer"]
      };

      const result = clientCreateUserSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const managerIssue = result.error.issues.find((i) => i.path.includes("managerName"));
        expect(managerIssue?.message).toBe("Select a manager");
      }
    });

    it("fails validation when teamNames is empty for team_member", () => {
      const invalidPayload = {
        firstName: "John",
        lastName: "Doe",
        phone: "9876543210",
        empID: "EMP101",
        email: "john@example.com",
        password: "Password123!",
        confirmPassword: "Password123!",
        role: "team_member",
        workspaceId: "ws-1",
        departments: [{ name: "Construction", subTeams: [] }],
        managerName: "Ramesh TL Construction",
        teamNames: [],
        roleTypes: ["Civil Engineer"]
      };

      const result = clientCreateUserSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const teamIssue = result.error.issues.find((i) => i.path.includes("teamNames"));
        expect(teamIssue?.message).toBe("Select at least one team type");
      }
    });
  });

  describe("2. Department-Based Manager Filtering", () => {
    it("filters managers strictly by the selected department (Construction)", () => {
      const filtered = filterManagersByDepartment(sampleTeamLeads, "Construction", sampleTeamTypes);
      expect(filtered.map((m) => m.name)).toEqual([
        "Ramesh TL Construction",
        "NoTeams Lead Construction"
      ]);
      expect(filtered.some((m) => m.name === "Suresh TL Software")).toBe(false);
    });

    it("filters managers strictly by Software department", () => {
      const filtered = filterManagersByDepartment(sampleTeamLeads, "Software", sampleTeamTypes);
      expect(filtered.map((m) => m.name)).toEqual(["Suresh TL Software"]);
    });
  });

  describe("3. Team Type Dependency & Empty State Messages", () => {
    it("returns empty team options and prompt message when manager is not selected", () => {
      const options = deriveAvailableTeamOptions({
        selectedRole: "team_member",
        currentManagerName: "",
        selectedManagers: sampleTeamLeads,
        teamOptions: sampleTeamTypes,
        selectedDepartment: "Construction"
      });

      expect(options).toEqual([]);

      const emptyMsg = getTeamTypeEmptyMessage({
        selectedRole: "team_member",
        currentManagerName: ""
      });
      expect(emptyMsg).toBe("Select a manager first to view available team types.");
    });

    it("loads and displays the manager's assigned team types once manager is selected", () => {
      const options = deriveAvailableTeamOptions({
        selectedRole: "team_member",
        currentManagerName: "Ramesh TL Construction",
        selectedManagers: sampleTeamLeads,
        teamOptions: sampleTeamTypes,
        selectedDepartment: "Construction"
      });

      expect(options.length).toBe(2);
      expect(options.map((t) => t.name)).toEqual(["CIVIL_SITE", "STRUCTURAL"]);
    });

    it("shows empty state message when selected manager has no assigned team types", () => {
      const options = deriveAvailableTeamOptions({
        selectedRole: "team_member",
        currentManagerName: "NoTeams Lead Construction",
        selectedManagers: sampleTeamLeads,
        teamOptions: sampleTeamTypes,
        selectedDepartment: "Construction"
      });

      expect(options).toEqual([]);

      const emptyMsg = getTeamTypeEmptyMessage({
        selectedRole: "team_member",
        currentManagerName: "NoTeams Lead Construction"
      });
      expect(emptyMsg).toBe("No team types available for the selected manager.");
    });

    it("loads all department team types for team_lead role", () => {
      const options = deriveAvailableTeamOptions({
        selectedRole: "team_lead",
        currentManagerName: "",
        selectedManagers: sampleTeamLeads,
        teamOptions: sampleTeamTypes,
        selectedDepartment: "Construction"
      });

      expect(options.length).toBe(2);
      expect(options.map((t) => t.name)).toEqual(["CIVIL_SITE", "STRUCTURAL"]);
    });
  });

  describe("4. Cascading Resets on Manager and Department Changes", () => {
    it("removes invalid team types when manager changes to another lead with different teams", () => {
      let currentSelectedTeams = ["CIVIL_SITE", "STRUCTURAL"];

      const newAvailableOptions = deriveAvailableTeamOptions({
        selectedRole: "team_member",
        currentManagerName: "Suresh TL Software",
        selectedManagers: sampleTeamLeads,
        teamOptions: sampleTeamTypes,
        selectedDepartment: "Software"
      });

      const validNames = currentSelectedTeams.filter((name) =>
        newAvailableOptions.some((o) => o.name === name || o.showName === name)
      );

      expect(validNames).toEqual([]);
    });

    it("resets manager when department changes and manager is not in the new department", () => {
      let currentManager = "Ramesh TL Construction";
      const softwareManagers = filterManagersByDepartment(sampleTeamLeads, "Software", sampleTeamTypes);

      if (!softwareManagers.some((m) => m.name === currentManager)) {
        currentManager = "";
      }

      expect(currentManager).toBe("");
    });
  });

  describe("5. End-to-End Valid Payload Submission", () => {
    it("passes validation with valid Manager + Team Type + Department + Skills", () => {
      const validPayload = {
        firstName: "Sathish",
        lastName: "Kumar",
        phone: "9876543210",
        empID: "CONST001",
        email: "sathish.worker@example.com",
        password: "Password123!",
        confirmPassword: "Password123!",
        role: "team_member" as const,
        workspaceId: "ws-construction",
        departments: [{ name: "Construction" as const, subTeams: [] }],
        managerName: "Ramesh TL Construction",
        teamNames: ["CIVIL_SITE"],
        roleTypes: ["Civil Engineer" as const]
      };

      const result = clientCreateUserSchema.safeParse(validPayload);
      expect(result.success).toBe(true);

      const serverResult = adminCreateUserSchema.safeParse(validPayload);
      expect(serverResult.success).toBe(true);
    });
  });

  describe("6. HOD Team Lead Creation Manager Resolution", () => {
    function resolveManagerForUserCreation({
      creatorUser,
      targetRole,
      selectedManagerName,
      allHods = [],
      allRms = [],
      allTls = []
    }: {
      creatorUser: { id: string; name: string; role: string; departments?: Array<{ name: string }> };
      targetRole: string;
      selectedManagerName?: string;
      allHods?: Array<{ _id: string; name: string; departments?: Array<{ name: string }> }>;
      allRms?: Array<{ _id: string; name: string; departments?: Array<{ name: string }> }>;
      allTls?: Array<{ _id: string; name: string; departments?: Array<{ name: string }> }>;
    }) {
      if (creatorUser.role === "team_lead") {
        return {
          resolvedManagerName: creatorUser.name,
          availableOptions: [],
          isAutoSet: true
        };
      }

      if (creatorUser.role === "hod") {
        if (targetRole === "team_lead" || targetRole === "report_manager") {
          return {
            resolvedManagerName: creatorUser.name,
            availableOptions: [{ _id: creatorUser.id, name: creatorUser.name }],
            isAutoSet: true
          };
        }
        if (targetRole === "team_member") {
          return {
            resolvedManagerName: selectedManagerName || "",
            availableOptions: allTls,
            isAutoSet: false
          };
        }
      }

      if (creatorUser.role === "report_manager") {
        if (targetRole === "team_lead") {
          return {
            resolvedManagerName: creatorUser.name,
            availableOptions: [{ _id: creatorUser.id, name: creatorUser.name }],
            isAutoSet: true
          };
        }
      }

      if (creatorUser.role === "admin" || creatorUser.role === "ceo") {
        if (targetRole === "team_lead" || targetRole === "report_manager") {
          return {
            resolvedManagerName: selectedManagerName || "",
            availableOptions: allHods,
            isAutoSet: false
          };
        }
        if (targetRole === "team_member") {
          return {
            resolvedManagerName: selectedManagerName || "",
            availableOptions: allTls,
            isAutoSet: false
          };
        }
      }

      return {
        resolvedManagerName: selectedManagerName || "",
        availableOptions: allHods,
        isAutoSet: false
      };
    }

    it("Test 1: Bagath (HOD) creating Team Lead sets manager to Bagath", () => {
      const bagath = { id: "hod-bagath-1", name: "Bagath", role: "hod" };
      const res = resolveManagerForUserCreation({
        creatorUser: bagath,
        targetRole: "team_lead",
        allHods: [{ _id: "hod-ramesh-2", name: "Ramesh" }, { _id: "hod-bagath-1", name: "Bagath" }]
      });

      expect(res.isAutoSet).toBe(true);
      expect(res.resolvedManagerName).toBe("Bagath");
      expect(res.availableOptions).toEqual([{ _id: "hod-bagath-1", name: "Bagath" }]);
    });

    it("Test 2: Sathish (HOD) creating Team Lead sets manager to Sathish", () => {
      const sathish = { id: "hod-sathish-3", name: "Sathish", role: "hod" };
      const res = resolveManagerForUserCreation({
        creatorUser: sathish,
        targetRole: "team_lead",
        allHods: [{ _id: "hod-ramesh-2", name: "Ramesh" }, { _id: "hod-sathish-3", name: "Sathish" }]
      });

      expect(res.isAutoSet).toBe(true);
      expect(res.resolvedManagerName).toBe("Sathish");
      expect(res.availableOptions).toEqual([{ _id: "hod-sathish-3", name: "Sathish" }]);
    });

    it("Test 3: Logged-in HOD does not show or default to another HOD (e.g. Ramesh)", () => {
      const bagath = { id: "hod-bagath-1", name: "Bagath", role: "hod" };
      const otherHods = [
        { _id: "hod-ramesh-2", name: "Ramesh" },
        { _id: "hod-sathish-3", name: "Sathish" }
      ];

      const res = resolveManagerForUserCreation({
        creatorUser: bagath,
        targetRole: "team_lead",
        selectedManagerName: "Ramesh",
        allHods: otherHods
      });

      expect(res.resolvedManagerName).toBe("Bagath");
      expect(res.availableOptions.some((o) => o.name === "Ramesh")).toBe(false);
    });

    it("Test 4: Submitted creation payload contains the logged-in HOD's name", () => {
      const bagath = { id: "hod-bagath-1", name: "Bagath", role: "hod" };
      const res = resolveManagerForUserCreation({
        creatorUser: bagath,
        targetRole: "team_lead"
      });

      const payload = {
        firstName: "Karthik",
        lastName: "Lead",
        phone: "9876543211",
        empID: "TL001",
        email: "karthik.lead@example.com",
        password: "Password123!",
        confirmPassword: "Password123!",
        role: "team_lead" as const,
        workspaceId: "ws-construction",
        departments: [{ name: "Construction" as const, subTeams: [] }],
        managerName: res.resolvedManagerName,
        teamNames: ["CIVIL_SITE"],
        roleTypes: ["Civil Engineer" as const]
      };

      expect(payload.managerName).toBe("Bagath");
      const validation = clientCreateUserSchema.safeParse(payload);
      expect(validation.success).toBe(true);
    });

    it("Test 5: Admin / CEO can still select from available department HODs", () => {
      const admin = { id: "admin-1", name: "Admin System", role: "admin" };
      const hodList = [
        { _id: "hod-ramesh-2", name: "Ramesh" },
        { _id: "hod-bagath-1", name: "Bagath" }
      ];

      const res = resolveManagerForUserCreation({
        creatorUser: admin,
        targetRole: "team_lead",
        selectedManagerName: "Ramesh",
        allHods: hodList
      });

      expect(res.isAutoSet).toBe(false);
      expect(res.resolvedManagerName).toBe("Ramesh");
      expect(res.availableOptions.length).toBe(2);
    });

    it("Test 6: HOD creating Team Member continues to select from department Team Leads", () => {
      const bagath = { id: "hod-bagath-1", name: "Bagath", role: "hod" };
      const tlList = [
        { _id: "tl-1", name: "Guna" },
        { _id: "tl-2", name: "Karthik" }
      ];

      const res = resolveManagerForUserCreation({
        creatorUser: bagath,
        targetRole: "team_member",
        selectedManagerName: "Guna",
        allTls: tlList
      });

      expect(res.isAutoSet).toBe(false);
      expect(res.resolvedManagerName).toBe("Guna");
      expect(res.availableOptions).toEqual(tlList);
    });
  });
});
