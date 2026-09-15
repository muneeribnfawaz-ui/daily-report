import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatTeamTypeShowName } from "@/lib/team-types";

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
  const url = new URL(request.url);
  const department = url.searchParams.get("department");
  const reqWorkspaceId = url.searchParams.get("workspaceId") || request.headers.get("x-workspace-id");

  const filter: Record<string, any> = { isActive: true, isDeleted: false };
  if (department && department !== "all") {
    filter.department = department;
  }

  const user = await getCurrentUser();
  if (user) {
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
      filter.workspaceId = user.workspaceId || "non_existent_id";
    }
  } else if (reqWorkspaceId && reqWorkspaceId !== "all") {
    filter.workspaceId = reqWorkspaceId;
  }

  const teamTypes = await db.teamType.findMany({
    where: filter,
    orderBy: { name: 'asc' }
  });

  return NextResponse.json({
    success: true,
    data: teamTypes.map((teamType: any) => ({
      ...teamType,
      _id: teamType.id,
      showName: formatTeamTypeShowName(teamType)
    }))
  });
}
