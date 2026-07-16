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

function computeTotals(data: {
  openingBalance: number;
  cashReceived: number;
  cardSales: number;
  onlinePayments: number;
  expenses: number;
  refunds: number;
  pettyCash: number;
  bankDeposit: number;
  closingCashBalance: number;
}) {
  const totalIncome = data.openingBalance + data.cashReceived + data.cardSales + data.onlinePayments;
  const totalExpenses = data.expenses + data.refunds + data.pettyCash;
  const netBalance = totalIncome - totalExpenses;
  return { totalIncome, totalExpenses, netBalance };
}

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

    // Compute totals
    const totals = computeTotals(parsed.data);

    // Fetch exchange rate
    const exchangeRate = await getINRtoSARRate();

    const reportPayload = {
      reportDate: dayStart,
      submittedBy: user.id,
      submittedByName: user.name,
      openingBalance: parsed.data.openingBalance,
      cashReceived: parsed.data.cashReceived,
      cardSales: parsed.data.cardSales,
      onlinePayments: parsed.data.onlinePayments,
      expenses: parsed.data.expenses,
      refunds: parsed.data.refunds,
      pettyCash: parsed.data.pettyCash,
      bankDeposit: parsed.data.bankDeposit,
      closingCashBalance: parsed.data.closingCashBalance,
      totalIncome: totals.totalIncome,
      totalExpenses: totals.totalExpenses,
      netBalance: totals.netBalance,
      exchangeRate,
      closingCashBalanceSAR: convertINRtoSAR(parsed.data.closingCashBalance, exchangeRate),
      totalIncomeSAR: convertINRtoSAR(totals.totalIncome, exchangeRate),
      totalExpensesSAR: convertINRtoSAR(totals.totalExpenses, exchangeRate),
      netBalanceSAR: convertINRtoSAR(totals.netBalance, exchangeRate),
      status: "pending"
    };

    const report = await FinanceReport.create(reportPayload);

    // Create notifications for admin/CEO users
    const adminUsers = await User.find({
      role: { $in: ["admin", "ceo"] },
      status: "active",
      isDeleted: false
    }).lean();

    const notifications = adminUsers.map((adminUser) => ({
      recipientId: adminUser._id,
      type: "finance_approval_request",
      title: "Finance Report — Pending Approval",
      message: `${user.name} submitted a finance report for ${dayStart.toISOString().slice(0, 10)}. Closing Balance: ₹${parsed.data.closingCashBalance.toLocaleString("en-IN")}. Awaiting your approval.`,
      metadata: {
        financeReportId: String(report._id),
        reportDate: dayStart.toISOString(),
        submittedBy: user.name,
        totalIncome: totals.totalIncome,
        closingCashBalance: parsed.data.closingCashBalance
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

    if (status) filter.status = status;
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
