import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canEditDailyReport } from "@/lib/report-edit-access";
import { mapReportRelations, reportRelationsInclude } from "@/lib/report-mapper";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  const team = url.searchParams.get("team");
  const workspaceId = url.searchParams.get("workspaceId") || request.headers.get("x-workspace-id");

  const filter: Record<string, unknown> = { employeeId: user.id };
  if (team && team !== "All" && team !== "all") {
    filter.teamName = team;
  }
  if (workspaceId && workspaceId !== "all" && workspaceId !== "All") {
    filter.workspaceId = workspaceId;
  }
  if (date) {
    const day = new Date(date);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    filter.reportDate = { gte: day, lt: nextDay };
  }

  const reports = await db.dailyReport.findMany({ 
    where: filter, 
    orderBy: { createdAt: 'desc' },
    include: reportRelationsInclude
  });
  
  const data = reports.map((report) => mapReportRelations({
    ...report,
    _id: report.id,
    canEdit: canEditDailyReport(report, user)
  }));

  return NextResponse.json({ success: true, data });
}
