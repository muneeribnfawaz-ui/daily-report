import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "ceo")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspaceId") || request.headers.get("x-workspace-id") || user.workspaceId;

  
  const filter: Record<string, any> = {};

  if (user.role !== "admin") {
    const memberships = await db.workspaceMember.findMany({ where: { userId: user.id, status: "active", isActive: true }, select: { workspaceId: true } });
    const allowedWorkspaceIds = memberships.map(m => String(m.workspaceId));

    if (workspaceId && workspaceId !== "all") {
      filter.workspaceId = allowedWorkspaceIds.includes(workspaceId) ? workspaceId : "non_existent_id";
    } else {
      filter.workspaceId = { in: allowedWorkspaceIds };
    }
  } else {
    if (workspaceId && workspaceId !== "all") {
      filter.workspaceId = workspaceId;
    }
  }

  const totalUsers = await db.workspaceMember.count({ where: { ...filter, isActive: true } });
  const totalEmployees = await db.workspaceMember.count({ where: { ...filter, isActive: true, role: "team_member" } });
  const totalReports = await db.dailyReport.count({ where: filter });
  const activeUsers = await db.workspaceMember.count({ where: { ...filter, status: "active", isActive: true } });

  return NextResponse.json({
    success: true,
    data: {
      totalUsers,
      totalEmployees,
      totalReports,
      activeUsers
    }
  });
}
