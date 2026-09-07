import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getVisibleReportEmployeeIds } from "@/lib/report-visibility";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspaceId") || request.headers.get("x-workspace-id") || user.workspaceId;

  
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

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

  const teamParam = url.searchParams.get("team") || url.searchParams.get("department") || request.headers.get("x-department");
  if (teamParam && teamParam !== "all" && teamParam !== "All") {
    filter.teamName = teamParam;
  }

  if (user.role === "team_member") {
    filter.employeeId = user.id;
  } else if (user.role !== "admin" && user.role !== "ceo" && user.role !== "hod") {
    const visibleEmployeeIds = await getVisibleReportEmployeeIds(user as any);
    if (visibleEmployeeIds) {
      filter.employeeId = { in: visibleEmployeeIds };
    }
  }

  const totalReportsToday = await db.dailyReport.count({
    where: {
      ...filter,
      reportDate: { gte: todayStart, lt: todayEnd }
    }
  });

  const pendingReports = await db.dailyReport.count({
    where: {
      ...filter,
      status: { in: ["pending", "submitted"] }
    }
  });

  const approvedReports = await db.dailyReport.count({
    where: {
      ...filter,
      status: "approved"
    }
  });

  const lockedReports = await db.dailyReport.count({
    where: {
      ...filter,
      isLocked: true
    }
  });

  const recentReports = await db.dailyReport.findMany({
    where: {
      ...filter,
      status: { in: ["submitted", "pending", "clarification_needed", "approved"] }
    },
    orderBy: [{ reportDate: 'desc' }, { createdAt: 'desc' }],
    take: 5,
    select: { id: true, name: true, teamName: true, status: true, blockers: true, requiredClarification: true, pendingWork: true }
  });

  const consolidationReady = await db.dailyReport.count({
    where: {
      ...filter,
      status: "approved",
      reportDate: { gte: todayStart, lt: todayEnd }
    }
  });

  const reportsWithBlockers = await db.dailyReport.count({
    where: {
      ...filter,
      blockers: { not: "" }
    }
  });

  const missingReports = await db.dailyReport.count({
    where: {
      ...filter,
      status: "clarification_needed"
    }
  });

  const pdfExports = await db.dailyReport.count({
    where: {
      ...filter,
      status: "approved"
    }
  });

  return NextResponse.json({
    success: true,
    data: {
      totalReportsToday,
      pendingReports,
      approvedReports,
      lockedReports,
      recentReports: recentReports.map(r => ({ ...r, _id: r.id })),
      operationalSnapshot: {
        consolidationReady,
        reportsWithBlockers,
        missingReports,
        pdfExports
      }
    }
  });
}
