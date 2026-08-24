import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import DailyReport from "@/models/DailyReport";
import WorkspaceMember from "@/models/WorkspaceMember";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspaceId") || request.headers.get("x-workspace-id") || user.workspaceId;

  await connectToDatabase();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const filter: Record<string, any> = {};

  if (user.role !== "admin") {
    const memberships = await WorkspaceMember.find({
      userId: user.id,
      status: "active",
      isActive: true
    }).select("workspaceId").lean() as any[];
    const allowedWorkspaceIds = memberships.map(m => String(m.workspaceId));

    if (workspaceId && workspaceId !== "all") {
      filter.workspaceId = allowedWorkspaceIds.includes(workspaceId) ? workspaceId : "non_existent_id";
    } else {
      filter.workspaceId = { $in: allowedWorkspaceIds };
    }
  } else {
    if (workspaceId && workspaceId !== "all") {
      filter.workspaceId = workspaceId;
    }
  }

  const totalReportsToday = await DailyReport.countDocuments({
    ...filter,
    reportDate: { $gte: todayStart, $lt: todayEnd }
  });

  const pendingReports = await DailyReport.countDocuments({
    ...filter,
    status: { $in: ["pending", "submitted"] }
  });

  const approvedReports = await DailyReport.countDocuments({
    ...filter,
    status: "approved"
  });

  const lockedReports = await DailyReport.countDocuments({
    ...filter,
    isLocked: true
  });

  const recentReports = await DailyReport.find({
    ...filter,
    status: { $in: ["submitted", "pending", "clarification_needed", "approved"] }
  })
    .sort({ reportDate: -1, createdAt: -1 })
    .limit(5)
    .select("name teamName status blockers requiredClarification pendingWork")
    .lean();

  const consolidationReady = await DailyReport.countDocuments({
    ...filter,
    status: "approved",
    reportDate: { $gte: todayStart, $lt: todayEnd }
  });

  const reportsWithBlockers = await DailyReport.countDocuments({
    ...filter,
    blockers: { $exists: true, $ne: "" }
  });

  const missingReports = await DailyReport.countDocuments({
    ...filter,
    status: "clarification_needed"
  });

  const pdfExports = await DailyReport.countDocuments({
    ...filter,
    status: "approved"
  });

  return NextResponse.json({
    success: true,
    data: {
      totalReportsToday,
      pendingReports,
      approvedReports,
      lockedReports,
      recentReports,
      operationalSnapshot: {
        consolidationReady,
        reportsWithBlockers,
        missingReports,
        pdfExports
      }
    }
  });
}
