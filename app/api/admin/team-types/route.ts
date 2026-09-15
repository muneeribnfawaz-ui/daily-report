import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";
import { formatTeamTypeShowName } from "@/lib/team-types";
import { authorizeApi } from "@/lib/api-auth";

function toInternalTeamTypeName(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toUpperCase();
}

const teamTypeSchema = z.object({
  showName: z.string().min(2),
  department: z.enum(["Construction", "Software", "Finance", "Marketing"]).optional(),
  subTeams: z.array(z.enum(["Physical", "Digital"])).optional().default([]),
  isActive: z.boolean().optional().default(true),
  isDeleted: z.boolean().optional().default(false),
  workspaceId: z.string().optional()
});

async function getCeoAllowedCompanyIds(userId: string): Promise<string[]> {
  const memberships = await db.workspaceMember.findMany({
    where: { userId, status: "active", isActive: true },
    include: { workspace: true }
  });
  const ceoWorkspaceIds = memberships.filter(m => m.workspace?.type === "ceo").map(m => m.workspaceId);
  const directCompanyIds = memberships.filter(m => m.workspace?.type !== "ceo").map(m => m.workspaceId);
  const ownedCompanies = await db.workspace.findMany({
    where: {
      ownerWorkspaceId: { in: ceoWorkspaceIds },
      isDeleted: false,
      isActive: true
    },
    select: { id: true }
  });
  return Array.from(new Set([...directCompanyIds, ...ownedCompanies.map(c => c.id)]));
}

export async function GET(request: Request) {
  const auth = await authorizeApi(["admin", "ceo", "hod", "report_manager", "team_lead"]);
  if (!auth.authorized) return auth.response;
  const user = auth.user;

  const url = new URL(request.url);
  const department = url.searchParams.get("department");
  const includeInactive = url.searchParams.get("includeInactive") === "true";
  const reqWorkspaceId = url.searchParams.get("workspaceId") || request.headers.get("x-workspace-id");

  const filter: Record<string, any> = { isDeleted: false };
  if (department && department !== "all") {
    filter.department = department;
  }
  if (!includeInactive) {
    filter.isActive = true;
  }

  if (user.role === "ceo") {
    const allowedCompanyIds = await getCeoAllowedCompanyIds(user.id);
    if (reqWorkspaceId && reqWorkspaceId !== "all") {
      filter.workspaceId = allowedCompanyIds.includes(reqWorkspaceId) ? reqWorkspaceId : "non_existent_id";
    } else if (reqWorkspaceId === "all") {
      filter.workspaceId = { in: allowedCompanyIds };
    } else if (user.workspaceId && user.workspaceId !== "all" && allowedCompanyIds.includes(user.workspaceId)) {
      filter.workspaceId = user.workspaceId;
    } else {
      filter.workspaceId = { in: allowedCompanyIds };
    }
  } else if (user.role === "admin") {
    if (reqWorkspaceId && reqWorkspaceId !== "all") {
      filter.workspaceId = reqWorkspaceId;
    }
  } else {
    // HOD, Report Manager, Team Lead, Team Member
    filter.workspaceId = user.workspaceId || "non_existent_id";

    const allowedDepartments = user.departments?.map((d: any) => d.name) || [];
    const allowedTeamNames = user.teamNames || [];

    if (allowedDepartments.length > 0 || allowedTeamNames.length > 0) {
      const roleFilter: Record<string, any>[] = [];
      if (allowedDepartments.length > 0) {
        roleFilter.push({ department: { in: allowedDepartments } });
      }
      if (allowedTeamNames.length > 0) {
        roleFilter.push({ name: { in: allowedTeamNames } });
      }
      
      filter.AND = filter.AND || [];
      filter.AND.push({ OR: roleFilter });
    } else if (user.role !== "hod" && user.role !== "report_manager") {
      filter.id = "none"; // Return empty if no assignments
    }
  }

  const teamTypes = await db.teamType.findMany({ where: filter, orderBy: { createdAt: 'desc' } });
  return NextResponse.json({
    success: true,
    data: teamTypes.map((teamType) => ({
      ...teamType,
      _id: teamType.id,
      showName: formatTeamTypeShowName(teamType)
    }))
  });
}

export async function POST(request: Request) {
  const auth = await authorizeApi(["admin", "ceo", "hod"]);
  if (!auth.authorized) return auth.response;
  const user = auth.user;

  const body = await request.json();
  const parsed = teamTypeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid payload", errors: parsed.error.format() }, { status: 400 });
  }

  const internalName = toInternalTeamTypeName(parsed.data.showName);
  if (!internalName) {
    return NextResponse.json({ success: false, message: "Invalid team type name" }, { status: 400 });
  }

  const url = new URL(request.url);
  const reqWorkspaceId = parsed.data.workspaceId || url.searchParams.get("workspaceId") || request.headers.get("x-workspace-id");

  let targetWorkspaceId: string | null = null;

  if (user.role === "ceo") {
    const allowedCompanyIds = await getCeoAllowedCompanyIds(user.id);
    if (reqWorkspaceId && reqWorkspaceId !== "all" && allowedCompanyIds.includes(reqWorkspaceId)) {
      targetWorkspaceId = reqWorkspaceId;
    } else if (user.workspaceId && user.workspaceId !== "all" && allowedCompanyIds.includes(user.workspaceId)) {
      targetWorkspaceId = user.workspaceId;
    } else if (allowedCompanyIds.length > 0) {
      targetWorkspaceId = allowedCompanyIds[0];
    } else {
      return NextResponse.json({ success: false, message: "No company workspace found for CEO" }, { status: 400 });
    }
  } else if (user.role === "hod") {
    targetWorkspaceId = user.workspaceId || null;
  } else {
    // Admin
    if (reqWorkspaceId && reqWorkspaceId !== "all") {
      targetWorkspaceId = reqWorkspaceId;
    } else if (user.workspaceId && user.workspaceId !== "all") {
      targetWorkspaceId = user.workspaceId;
    } else {
      const firstCompany = await db.workspace.findFirst({ where: { type: "company", isActive: true, isDeleted: false } });
      targetWorkspaceId = firstCompany?.id || null;
    }
  }

  if (!targetWorkspaceId) {
    return NextResponse.json({ success: false, message: "Company workspace is required to create a team type" }, { status: 400 });
  }

  const existing = await db.teamType.findFirst({
    where: {
      workspaceId: targetWorkspaceId,
      name: internalName,
      isDeleted: false
    }
  });
  if (existing) {
    return NextResponse.json({ success: false, message: "A team type with this name already exists in this company" }, { status: 409 });
  }

  const newTeamType = await db.teamType.create({
    data: {
      workspaceId: targetWorkspaceId,
      name: internalName,
      showName: parsed.data.showName,
      department: parsed.data.department ?? "",
      subTeams: parsed.data.department === "Marketing" ? parsed.data.subTeams : [],
      isActive: parsed.data.isActive,
      isDeleted: parsed.data.isDeleted,
      createdBy: user.name || "System"
    }
  });

  return NextResponse.json({
    success: true,
    data: {
      ...newTeamType,
      _id: newTeamType.id,
      showName: formatTeamTypeShowName(newTeamType)
    }
  }, { status: 201 });
}

