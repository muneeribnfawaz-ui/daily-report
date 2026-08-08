import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { financeReportSchema } from "@/lib/validation";
import { getCurrentUser } from "@/lib/auth";
import { canCreateFinanceReport, canViewFinanceReport } from "@/lib/permissions";
import FinanceReport from "@/models/FinanceReport";
import Notification from "@/models/Notification";
import User from "@/models/User";
import { logAuditEntry } from "@/lib/audit";
import { getINRtoSARRate, convertINRtoSAR } from "@/lib/currency";
import { FINANCE_TEAM_INTERNAL_NAME } from "@/lib/constants";



export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    if (!canCreateFinanceReport(user)) {
      return NextResponse.json({ success: false, message: "You do not have permission to create finance reports" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = financeReportSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Invalid finance report payload";
      return NextResponse.json({ success: false, message: firstError }, { status: 400 });
    }

    await connectToDatabase();

    // Check for existing report on the same date
    const reportDate = new Date(parsed.data.reportDate);
    const dayStart = new Date(reportDate);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const existingReport = await FinanceReport.findOne({
      reportDate: { $gte: dayStart, $lt: dayEnd }
    });

    if (existingReport) {
      return NextResponse.json(
        { success: false, message: "A finance report already exists for this date. Please edit the existing report instead." },
        { status: 409 }
      );
    }

    // Fetch exchange rate
    const exchangeRate = await getINRtoSARRate();

    const reportPayload = {
      reportDate: dayStart,
      submittedBy: user.id,
      submittedByName: user.name,
      expenses: parsed.data.expenses,
      receipts: parsed.data.receipts,
      payments: parsed.data.payments,
      bankBalances: parsed.data.bankBalances,
      cashBalance: parsed.data.cashBalance,
      nextDayApprovals: parsed.data.nextDayApprovals,
      summary: parsed.data.summary,
      exchangeRate,
      status: "pending",
      statusHistory: [
        {
          status: "pending",
          by: user.id,
          byName: user.name,
          timestamp: new Date()
        }
      ]
    };

    const report = await FinanceReport.create(reportPayload);

    // Create notifications for Finance HODs
    const financeHods = await User.find({
      role: "hod",
      $or: [
        { teamNames: FINANCE_TEAM_INTERNAL_NAME },
        { teamName: FINANCE_TEAM_INTERNAL_NAME },
        { "departments.name": "Finance" },
        { "departments.name": FINANCE_TEAM_INTERNAL_NAME }
      ],
      status: "active",
      isDeleted: false
    }).lean();

    const notifications = financeHods.map((hodUser) => ({
      recipientId: hodUser._id,
      type: "finance_approval_request",
      title: "Finance Report — Pending Forward",
      message: `${user.name} submitted a finance report for ${dayStart.toISOString().slice(0, 10)}. Closing Balance: ₹${parsed.data.summary.bankBalance.toLocaleString("en-IN")}. Awaiting your approval.`,
      metadata: {
        financeReportId: String(report._id),
        reportDate: dayStart.toISOString(),
        submittedBy: user.name,
        totalIncome: parsed.data.summary.totalReceipts,
        closingCashBalance: parsed.data.summary.bankBalance
      },
      linkUrl: `/finance/${String(report._id)}`
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    await logAuditEntry({
      action: "Finance Report Created",
      userId: user.id,
      userName: user.name,
      financeReportId: String(report._id),
      newValue: reportPayload
    });

    return NextResponse.json({ success: true, data: report, message: "Finance report submitted successfully." }, { status: 201 });
  } catch (error) {
    console.error("Failed to create finance report", error);
    return NextResponse.json({ success: false, message: "Failed to create finance report" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    if (!canViewFinanceReport(user)) {
      return NextResponse.json({ success: false, message: "You do not have permission to view finance reports" }, { status: 403 });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const date = url.searchParams.get("date");
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 100);

    await connectToDatabase();
    const filter: Record<string, unknown> = {};

    if (status) {
      filter.status = status;
    } else if (user.role === "ceo") {
      filter.status = { $in: ["forwarded_to_ceo", "approved", "rejected"] };
    }
    if (date) {
      const day = new Date(date);
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);
      filter.reportDate = { $gte: day, $lt: nextDay };
    }

    const reports = await FinanceReport.find(filter)
      .sort({ reportDate: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ success: true, data: reports });
  } catch (error) {
    console.error("Failed to fetch finance reports", error);
    return NextResponse.json({ success: false, message: "Failed to fetch finance reports" }, { status: 500 });
  }
}
