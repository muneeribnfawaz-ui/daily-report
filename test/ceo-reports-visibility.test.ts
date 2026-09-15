import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getVisibleReportEmployeeIds } from "@/lib/report-visibility";

vi.mock("@/lib/db", () => {
  return {
    default: {
      workspaceMember: {
        findMany: vi.fn()
      },
      workspace: {
        findMany: vi.fn()
      },
      teamType: {
        findMany: vi.fn().mockResolvedValue([])
      },
      dailyReport: {
        findMany: vi.fn()
      },
      user: {
        findMany: vi.fn()
      }
    }
  };
});
import db from "@/lib/db";

describe("CEO Reports Visibility & Scoping", () => {
  const ceoUser = {
    id: "ceo-1",
    name: "John CEO",
    role: "ceo",
    workspaceId: "ceo-ws-1"
  };

  const mockCeoMemberships = [
    {
      userId: "ceo-1",
      workspaceId: "ceo-ws-1",
      status: "active",
      isActive: true,
      workspace: { id: "ceo-ws-1", type: "ceo" }
    }
  ];

  const mockOwnedCompanyWorkspaces = [
    { id: "comp-ws-1", name: "Company Alpha", ownerWorkspaceId: "ceo-ws-1", isActive: true, isDeleted: false },
    { id: "comp-ws-2", name: "Company Beta", ownerWorkspaceId: "ceo-ws-1", isActive: true, isDeleted: false }
  ];

  const mockEmployees = [
    {
      userId: "emp-hod-1",
      workspaceId: "comp-ws-1",
      role: "hod",
      status: "active",
      isActive: true,
      user: { id: "emp-hod-1", name: "Sathish HOD" },
      departments: [{ name: "Construction" }]
    },
    {
      userId: "emp-rm-1",
      workspaceId: "comp-ws-1",
      role: "report_manager",
      status: "active",
      isActive: true,
      user: { id: "emp-rm-1", name: "Avinash RM" },
      departments: [{ name: "Construction" }]
    },
    {
      userId: "emp-tl-1",
      workspaceId: "comp-ws-1",
      role: "team_lead",
      status: "active",
      isActive: true,
      user: { id: "emp-tl-1", name: "Sameer TL" },
      departments: [{ name: "Engineering" }]
    },
    {
      userId: "emp-tm-1",
      workspaceId: "comp-ws-1",
      role: "team_member",
      status: "active",
      isActive: true,
      user: { id: "emp-tm-1", name: "Imam TM" },
      departments: [{ name: "Construction" }]
    },
    {
      userId: "ceo-1",
      workspaceId: "ceo-ws-1",
      role: "ceo",
      status: "active",
      isActive: true,
      user: { id: "ceo-1", name: "John CEO" },
      departments: []
    },
    {
      userId: "emp-other-ws",
      workspaceId: "other-foreign-ws",
      role: "team_member",
      status: "active",
      isActive: true,
      user: { id: "emp-other-ws", name: "Foreign Employee" },
      departments: [{ name: "Software" }]
    }
  ];

  beforeEach(() => {
    (db.workspaceMember.findMany as any).mockImplementation(async (args: any) => {
      if (args?.where?.userId === "ceo-1") {
        return mockCeoMemberships as any;
      }
      // Return workspace members matching memberFilter
      const allowedWs = args?.where?.workspaceId?.in || (args?.where?.workspaceId ? [args.where.workspaceId] : []);
      return mockEmployees.filter(e => allowedWs.includes(e.workspaceId)) as any;
    });

    (db.workspace.findMany as any).mockImplementation(async (args: any) => {
      const ownerIn = args?.where?.ownerWorkspaceId?.in || [];
      return mockOwnedCompanyWorkspaces.filter(w => ownerIn.includes(w.ownerWorkspaceId)) as any;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("1. CEO can retrieve visible employee IDs across all employee roles (HOD, RM, TL, TM)", async () => {
    const visibleIds = await getVisibleReportEmployeeIds(ceoUser);

    expect(visibleIds).toBeDefined();
    expect(visibleIds).toContain("emp-hod-1");
    expect(visibleIds).toContain("emp-rm-1");
    expect(visibleIds).toContain("emp-tl-1");
    expect(visibleIds).toContain("emp-tm-1");
    expect(visibleIds).toContain("ceo-1");
  });

  it("2. CEO does NOT see employees from another foreign workspace", async () => {
    const visibleIds = await getVisibleReportEmployeeIds(ceoUser);

    expect(visibleIds).not.toContain("emp-other-ws");
  });

  it("3. Scoping to a specific company workspace returns only employees in that company", async () => {
    const visibleIds = await getVisibleReportEmployeeIds(ceoUser, { workspaceId: "comp-ws-1" });

    expect(visibleIds).toContain("emp-hod-1");
    expect(visibleIds).toContain("emp-rm-1");
    expect(visibleIds).toContain("emp-tl-1");
    expect(visibleIds).toContain("emp-tm-1");
    expect(visibleIds).not.toContain("emp-other-ws");
  });

  it("4. Scoping to an unauthorized workspace returns empty / non-existent filter", async () => {
    const visibleIds = await getVisibleReportEmployeeIds(ceoUser, { workspaceId: "unauthorized-ws" });

    expect(visibleIds).toHaveLength(0);
    expect(visibleIds).not.toContain("emp-hod-1");
    expect(visibleIds).not.toContain("ceo-1");
  });

  it("5. Non-CEO HOD scope restriction is preserved (CEO with scope='hod' only sees HODs)", async () => {
    const visibleIds = await getVisibleReportEmployeeIds(ceoUser, { scope: "hod" });

    expect(visibleIds).toContain("emp-hod-1");
    expect(visibleIds).toContain("ceo-1");
    expect(visibleIds).not.toContain("emp-rm-1");
    expect(visibleIds).not.toContain("emp-tl-1");
    expect(visibleIds).not.toContain("emp-tm-1");
  });
});
