import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canViewFinanceReport } from "@/lib/permissions";
import { encryptPayload } from "@/lib/crypto";
import { buildWorkspaceFilter } from "@/lib/workspace-context";

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
    const workspaceId = url.searchParams.get("workspaceId") || request.headers.get("x-workspace-id");

    const where: Record<string, any> = await buildWorkspaceFilter(user, workspaceId);

    // Today's date range
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    // Today's finance report
    const todayReport = await db.financeReport.findFirst({
      where: {
        ...where,
        reportDate: { gte: todayStart, lt: todayEnd }
      },
      include: { items: true, bankBalances: true }
    });

    // Pending approvals count
    const pendingCount = await db.financeReport.count({ where: { ...where, status: "pending" } });

    // Last submitted report
    const lastReport = await db.financeReport.findFirst({
      where,
      orderBy: { reportDate: 'desc' }
    });

    let todayRevenue = 0;
    let todayExpenses = 0;
    let closingCashBalance = 0;

    if (todayReport) {
      todayRevenue = todayReport.items.filter(i => i.type === "receipt").reduce((sum, item) => sum + (item.amountINR || 0), 0);
      todayExpenses = todayReport.items.filter(i => i.type === "expense" || i.type === "payment").reduce((sum, item) => sum + (item.amountINR || 0), 0);
      closingCashBalance = todayReport.bankBalances.reduce((sum, b) => sum + (b.closingBalance || 0), 0);
    }
    const sarRate = todayReport?.exchangeRate || 0.0428;

    const dashboard = {
      todayRevenue: todayRevenue,
      todayExpenses: todayExpenses,
      netProfitLoss: todayRevenue - todayExpenses,
      closingCashBalance: closingCashBalance,
      closingCashBalanceSAR: closingCashBalance * sarRate,
      pendingApprovals: pendingCount,
      lastReportDate: lastReport?.reportDate || null,
      lastReportStatus: lastReport?.status || null,
      hasTodayReport: Boolean(todayReport)
    };

    const encryptedData = await encryptPayload(dashboard);
    return NextResponse.json({ success: true, encryptedData, data: dashboard });
  } catch (error) {
    console.error("Failed to fetch finance dashboard data", error);
    return NextResponse.json({ success: false, message: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
