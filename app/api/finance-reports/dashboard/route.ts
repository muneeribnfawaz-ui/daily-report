import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canViewFinanceReport } from "@/lib/permissions";
import FinanceReport from "@/models/FinanceReport";
import WorkspaceMember from "@/models/WorkspaceMember";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LeanDoc = Record<string, any>;

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    if (!canViewFinanceReport(user)) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const url = new URL(request.url);
    const workspaceId = url.searchParams.get("workspaceId") || request.headers.get("x-workspace-id") || user.workspaceId;

    await connectToDatabase();

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

    // Today's date range
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    // Today's finance report
    const todayReport = await FinanceReport.findOne({
      ...filter,
      reportDate: { $gte: todayStart, $lt: todayEnd }
    }).lean() as LeanDoc | null;

    // Pending approvals count
    const pendingCount = await FinanceReport.countDocuments({ ...filter, status: "pending" });

    // Last submitted report
    const lastReport = await FinanceReport.findOne(filter)
      .sort({ reportDate: -1 })
      .lean() as LeanDoc | null;

    const dashboard = {
      todayRevenue: (todayReport?.totalIncome as number) || 0,
      todayExpenses: (todayReport?.totalExpenses as number) || 0,
      netProfitLoss: (todayReport?.netBalance as number) || 0,
      closingCashBalance: (todayReport?.closingCashBalance as number) || 0,
      closingCashBalanceSAR: (todayReport?.closingCashBalanceSAR as number) || 0,
      pendingApprovals: pendingCount,
      lastReportDate: lastReport?.reportDate || null,
      lastReportStatus: (lastReport?.status as string) || null,
      hasTodayReport: Boolean(todayReport)
    };

    return NextResponse.json({ success: true, data: dashboard });
  } catch (error) {
    console.error("Failed to fetch finance dashboard data", error);
    return NextResponse.json({ success: false, message: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
