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

const teamTypeUpdateSchema = z.object({
  showName: z.string().min(2).optional(),
  department: z.enum(["Construction", "Software", "Finance", "Marketing"]).optional().nullable(),
  subTeams: z.array(z.enum(["Physical", "Digital"])).optional(),
  isActive: z.boolean().optional(),
  isDeleted: z.boolean().optional()
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

async function canAccessTeamType(user: any, teamType: any): Promise<boolean> {
  if (user.role === "admin") return true;
  if (!teamType.workspaceId) return true;
  if (user.role === "ceo") {
    const allowedCompanyIds = await getCeoAllowedCompanyIds(user.id);
    return allowedCompanyIds.includes(teamType.workspaceId);
  }
  if (user.role === "hod") {
    return teamType.workspaceId === user.workspaceId;
  }
  return false;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApi(["admin", "ceo", "hod"]);
  if (!auth.authorized) return auth.response;
  const user = auth.user;

  const { id } = await Promise.resolve(params);
  const teamType = await db.teamType.findUnique({ where: { id: String(id) } });
  if (!teamType || teamType.isDeleted) {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  }

  const hasAccess = await canAccessTeamType(user, teamType);
  if (!hasAccess) {
    return NextResponse.json({ success: false, message: "You do not have permission to view this team type." }, { status: 403 });
  }

  return NextResponse.json({
    success: true,
    data: {
      ...teamType,
      _id: teamType.id,
      showName: formatTeamTypeShowName(teamType)
    }
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApi(["admin", "ceo", "hod"]);
  if (!auth.authorized) return auth.response;
  const user = auth.user;

  const { id } = await Promise.resolve(params);
  const body = await request.json();
  const parsed = teamTypeUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid payload", errors: parsed.error.format() }, { status: 400 });
  }

  const existing = await db.teamType.findUnique({ where: { id: String(id) } });
  if (!existing || existing.isDeleted) {
    return NextResponse.json({ success: false, message: "Team type not found" }, { status: 404 });
  }

  const hasAccess = await canAccessTeamType(user, existing);
  if (!hasAccess) {
    return NextResponse.json({ success: false, message: "You do not have permission to modify this team type." }, { status: 403 });
  }

  const dataToUpdate: any = {};
  if (parsed.data.showName !== undefined) {
    const internalName = toInternalTeamTypeName(parsed.data.showName);
    if (!internalName) {
      return NextResponse.json({ success: false, message: "Invalid team type name" }, { status: 400 });
    }

    if (existing.workspaceId) {
      const duplicate = await db.teamType.findFirst({
        where: {
          workspaceId: existing.workspaceId,
          name: internalName,
          id: { not: existing.id },
          isDeleted: false
        }
      });
      if (duplicate) {
        return NextResponse.json({ success: false, message: "A team type with this name already exists in this company" }, { status: 409 });
      }
    }

    dataToUpdate.name = internalName;
    dataToUpdate.showName = parsed.data.showName;
  }

  if (parsed.data.department !== undefined) dataToUpdate.department = parsed.data.department ?? "";
  if (parsed.data.subTeams !== undefined) {
    dataToUpdate.subTeams = (dataToUpdate.department ?? existing.department) === "Marketing" ? parsed.data.subTeams : [];
  }
  if (parsed.data.isActive !== undefined) dataToUpdate.isActive = parsed.data.isActive;
  if (parsed.data.isDeleted !== undefined) dataToUpdate.isDeleted = parsed.data.isDeleted;

  const updated = await db.teamType.update({
    where: { id: existing.id },
    data: dataToUpdate
  });

  return NextResponse.json({
    success: true,
    data: {
      ...updated,
      _id: updated.id,
      showName: formatTeamTypeShowName(updated)
    }
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApi(["admin", "ceo", "hod"]);
  if (!auth.authorized) return auth.response;
  const user = auth.user;

  const { id } = await Promise.resolve(params);
  const existing = await db.teamType.findUnique({ where: { id: String(id) } });
  if (!existing || existing.isDeleted) {
    return NextResponse.json({ success: false, message: "Team type not found" }, { status: 404 });
  }

  const hasAccess = await canAccessTeamType(user, existing);
  if (!hasAccess) {
    return NextResponse.json({ success: false, message: "You do not have permission to delete this team type." }, { status: 403 });
  }

  await db.teamType.update({
    where: { id: existing.id },
    data: { isDeleted: true, isActive: false }
  });

  return NextResponse.json({ success: true, message: "Team type deleted successfully" });
}

