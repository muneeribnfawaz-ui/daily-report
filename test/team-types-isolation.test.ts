import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getAdminTeamTypes, POST as createAdminTeamType } from "@/app/api/admin/team-types/route";
import { GET as getTeamTypeById, PATCH as updateTeamTypeById, DELETE as deleteTeamTypeById } from "@/app/api/admin/team-types/[id]/route";
import { GET as getPublicTeamTypes } from "@/app/api/team-types/route";
import { getActiveTeamTypeNames, getActiveTeamTypeShowNameMap, isValidTeamTypeName, getTeamNamesByDepartment } from "@/lib/team-types";

// Mock dependencies
vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn()
}));

vi.mock("@/lib/api-auth", () => ({
  authorizeApi: vi.fn()
}));

vi.mock("@/lib/db", () => {
  return {
    default: {
      teamType: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn()
      },
      workspace: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn()
      },
      workspaceMember: {
        findMany: vi.fn(),
        findFirst: vi.fn()
      }
    }
  };
});

import { getCurrentUser } from "@/lib/auth";
import { authorizeApi } from "@/lib/api-auth";
import db from "@/lib/db";

describe("Team Types Company-Level Data Isolation", () => {
  const mifCompanyId = "comp-mif-100";
  const absalCompanyId = "comp-absal-200";

  const ceoUserMif = {
    id: "user-ceo-mif",
    name: "CEO",
    email: "ceo@mif.com",
    role: "ceo",
    workspaceId: mifCompanyId,
    status: "active"
  };

  const ceoUserMuneer = {
    id: "user-ceo-muneer",
    name: "Muneer",
    email: "muneer@gmail.com",
    role: "ceo",
    workspaceId: absalCompanyId,
    status: "active"
  };

  const mifTeamType = {
    id: "tt-mif-1",
    workspaceId: mifCompanyId,
    name: "MIF_TEAM",
    showName: "MIF Team",
    department: "Software",
    subTeams: [],
    isActive: true,
    isDeleted: false,
    createdBy: "CEO"
  };

  const muneerTeamType = {
    id: "tt-absal-1",
    workspaceId: absalCompanyId,
    name: "MUNEER_TEAM",
    showName: "Muneer Team",
    department: "Software",
    subTeams: [],
    isActive: true,
    isDeleted: false,
    createdBy: "Muneer"
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("CEO of MIF creates Team Type 'MIF Team' and automatically binds to MIF companyId", async () => {
    vi.mocked(authorizeApi).mockResolvedValue({ authorized: true, user: ceoUserMif as any });
    vi.mocked(db.workspaceMember.findMany).mockResolvedValue([
      { userId: ceoUserMif.id, workspaceId: mifCompanyId, status: "active", isActive: true, workspace: { id: mifCompanyId, type: "company" } }
    ] as any);
    vi.mocked(db.workspace.findMany).mockResolvedValue([]);
    vi.mocked(db.teamType.findFirst).mockResolvedValue(null);
    vi.mocked(db.teamType.create).mockResolvedValue(mifTeamType as any);

    const request = new Request("http://localhost/api/admin/team-types", {
      method: "POST",
      body: JSON.stringify({
        showName: "MIF Team",
        department: "Software",
        isActive: true
      })
    });

    const response = await createAdminTeamType(request);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.success).toBe(true);
    expect(db.teamType.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: mifCompanyId,
        name: "MIF_TEAM",
        showName: "MIF Team"
      })
    });
  });

  it("CEO Muneer of Absalkhan Private Limited creates Team Type 'Muneer Team' and automatically binds to Absalkhan companyId", async () => {
    vi.mocked(authorizeApi).mockResolvedValue({ authorized: true, user: ceoUserMuneer as any });
    vi.mocked(db.workspaceMember.findMany).mockResolvedValue([
      { userId: ceoUserMuneer.id, workspaceId: absalCompanyId, status: "active", isActive: true, workspace: { id: absalCompanyId, type: "company" } }
    ] as any);
    vi.mocked(db.workspace.findMany).mockResolvedValue([]);
    vi.mocked(db.teamType.findFirst).mockResolvedValue(null);
    vi.mocked(db.teamType.create).mockResolvedValue(muneerTeamType as any);

    const request = new Request("http://localhost/api/admin/team-types", {
      method: "POST",
      body: JSON.stringify({
        showName: "Muneer Team",
        department: "Software",
        isActive: true
      })
    });

    const response = await createAdminTeamType(request);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.success).toBe(true);
    expect(db.teamType.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: absalCompanyId,
        name: "MUNEER_TEAM",
        showName: "Muneer Team"
      })
    });
  });

  it("Muneer listing team types only queries and receives Team Types from Absalkhan company, NOT from MIF", async () => {
    vi.mocked(authorizeApi).mockResolvedValue({ authorized: true, user: ceoUserMuneer as any });
    vi.mocked(db.workspaceMember.findMany).mockResolvedValue([
      { userId: ceoUserMuneer.id, workspaceId: absalCompanyId, status: "active", isActive: true, workspace: { id: absalCompanyId, type: "company" } }
    ] as any);
    vi.mocked(db.workspace.findMany).mockResolvedValue([]);
    (db.teamType.findMany as any).mockImplementation(async (args: any) => {
      // Server-side filter assertion
      expect(args.where.workspaceId).toBe(absalCompanyId);
      return [muneerTeamType] as any;
    });

    const request = new Request(`http://localhost/api/admin/team-types?workspaceId=${absalCompanyId}`);
    const response = await getAdminTeamTypes(request);
    const json = await response.json();

    expect(json.success).toBe(true);
    expect(json.data.length).toBe(1);
    expect(json.data[0].name).toBe("MUNEER_TEAM");
    expect(json.data.some((t: any) => t.name === "MIF_TEAM")).toBe(false);
  });

  it("CEO listing team types for MIF only receives MIF Team, NOT Muneer Team", async () => {
    vi.mocked(authorizeApi).mockResolvedValue({ authorized: true, user: ceoUserMif as any });
    vi.mocked(db.workspaceMember.findMany).mockResolvedValue([
      { userId: ceoUserMif.id, workspaceId: mifCompanyId, status: "active", isActive: true, workspace: { id: mifCompanyId, type: "company" } }
    ] as any);
    vi.mocked(db.workspace.findMany).mockResolvedValue([]);
    (db.teamType.findMany as any).mockImplementation(async (args: any) => {
      expect(args.where.workspaceId).toBe(mifCompanyId);
      return [mifTeamType] as any;
    });

    const request = new Request(`http://localhost/api/admin/team-types?workspaceId=${mifCompanyId}`);
    const response = await getAdminTeamTypes(request);
    const json = await response.json();

    expect(json.success).toBe(true);
    expect(json.data.length).toBe(1);
    expect(json.data[0].name).toBe("MIF_TEAM");
    expect(json.data.some((t: any) => t.name === "MUNEER_TEAM")).toBe(false);
  });

  it("Rejects cross-company edit: Muneer cannot edit MIF's team type", async () => {
    vi.mocked(authorizeApi).mockResolvedValue({ authorized: true, user: ceoUserMuneer as any });
    vi.mocked(db.workspaceMember.findMany).mockResolvedValue([
      { userId: ceoUserMuneer.id, workspaceId: absalCompanyId, status: "active", isActive: true, workspace: { id: absalCompanyId, type: "company" } }
    ] as any);
    vi.mocked(db.workspace.findMany).mockResolvedValue([]);
    vi.mocked(db.teamType.findUnique).mockResolvedValue(mifTeamType as any);

    const request = new Request(`http://localhost/api/admin/team-types/${mifTeamType.id}`, {
      method: "PATCH",
      body: JSON.stringify({ showName: "Hacked MIF Team" })
    });

    const response = await updateTeamTypeById(request, { params: Promise.resolve({ id: mifTeamType.id }) });
    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.message).toContain("permission");
  });

  it("Rejects cross-company delete: Muneer cannot delete MIF's team type", async () => {
    vi.mocked(authorizeApi).mockResolvedValue({ authorized: true, user: ceoUserMuneer as any });
    vi.mocked(db.workspaceMember.findMany).mockResolvedValue([
      { userId: ceoUserMuneer.id, workspaceId: absalCompanyId, status: "active", isActive: true, workspace: { id: absalCompanyId, type: "company" } }
    ] as any);
    vi.mocked(db.workspace.findMany).mockResolvedValue([]);
    vi.mocked(db.teamType.findUnique).mockResolvedValue(mifTeamType as any);

    const request = new Request(`http://localhost/api/admin/team-types/${mifTeamType.id}`, {
      method: "DELETE"
    });

    const response = await deleteTeamTypeById(request, { params: Promise.resolve({ id: mifTeamType.id }) });
    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.message).toContain("permission");
  });

  it("Public / dropdowns team-types route filters correctly by workspaceId", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(ceoUserMuneer as any);
    vi.mocked(db.workspaceMember.findMany).mockResolvedValue([
      { userId: ceoUserMuneer.id, workspaceId: absalCompanyId, status: "active", isActive: true, workspace: { id: absalCompanyId, type: "company" } }
    ] as any);
    vi.mocked(db.workspace.findMany).mockResolvedValue([]);
    (db.teamType.findMany as any).mockImplementation(async (args: any) => {
      expect(args.where.workspaceId).toBe(absalCompanyId);
      return [muneerTeamType] as any;
    });

    const request = new Request(`http://localhost/api/team-types?workspaceId=${absalCompanyId}`);
    const response = await getPublicTeamTypes(request);
    const json = await response.json();

    expect(json.success).toBe(true);
    expect(json.data.length).toBe(1);
    expect(json.data[0].name).toBe("MUNEER_TEAM");
  });

  it("lib/team-types helper functions respect workspaceId", async () => {
    (db.teamType.findMany as any).mockImplementation(async (args: any) => {
      if (args.where.workspaceId === absalCompanyId) {
        return [muneerTeamType] as any;
      }
      if (args.where.workspaceId === mifCompanyId) {
        return [mifTeamType] as any;
      }
      return [mifTeamType, muneerTeamType] as any;
    });

    const absalTeamNames = await getActiveTeamTypeNames(absalCompanyId);
    expect(absalTeamNames).toEqual(["MUNEER_TEAM"]);

    const mifTeamNames = await getActiveTeamTypeNames(mifCompanyId);
    expect(mifTeamNames).toEqual(["MIF_TEAM"]);

    const isMuneerValidInAbsal = await isValidTeamTypeName("MUNEER_TEAM", absalCompanyId);
    expect(isMuneerValidInAbsal).toBe(true);

    const isMifValidInAbsal = await isValidTeamTypeName("MIF_TEAM", absalCompanyId);
    expect(isMifValidInAbsal).toBe(false);
  });
});
