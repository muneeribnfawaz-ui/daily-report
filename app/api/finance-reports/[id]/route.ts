import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canViewFinanceReport, canEditFinanceReport, canApproveFinanceReport } from "@/lib/permissions";
import FinanceReport from "@/models/FinanceReport";
import { logAuditEntry } from "@/lib/audit";
import { financeReportSchema } from "@/lib/validation";
import { getINRtoSARRate, convertINRtoSAR } from "@/lib/currency";

type RouteContext = { params: Promise<{ id: string }> };

function computeTotals(data: {
  openingBalance: number;
  cashReceived: number;
  cardSales: number;
  onlinePayments: number;
  expenses: number;
  refunds: number;
  pettyCash: number;
}) {
  const totalIncome = data.openingBalance + data.cashReceived + data.cardSales + data.onlinePayments;
  const totalExpenses = data.expenses + data.refunds + data.pettyCash;
  const netBalance = totalIncome - totalExpenses;
  return { totalIncome, totalExpenses, netBalance };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    if (!canViewFinanceReport(user)) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    await connectToDatabase();
    const report = await FinanceReport.findById(id).lean() as Record<string, unknown> | null;

    if (!report) {
      return NextResponse.json({ success: false, message: "Finance report not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    console.error("Failed to fetch finance report", error);
    return NextResponse.json({ success: false, message: "Failed to fetch finance report" }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    if (!canEditFinanceReport(user)) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    await connectToDatabase();
    const report = await FinanceReport.findById(id);

    if (!report) {
      return NextResponse.json({ success: false, message: "Finance report not found" }, { status: 404 });
    }

    if (report.status !== "pending") {
      return NextResponse.json(
        { success: false, message: "Only pending finance reports can be edited" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = financeReportSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Invalid payload";
      return NextResponse.json({ success: false, message: firstError }, { status: 400 });
    }

    const previous = report.toObject();
    const totals = computeTotals(parsed.data);
    const exchangeRate = await getINRtoSARRate();

    report.openingBalance = parsed.data.openingBalance;
    report.cashReceived = parsed.data.cashReceived;
    report.cardSales = parsed.data.cardSales;
    report.onlinePayments = parsed.data.onlinePayments;
    report.expenses = parsed.data.expenses;
    report.refunds = parsed.data.refunds;
    report.pettyCash = parsed.data.pettyCash;
    report.bankDeposit = parsed.data.bankDeposit;
    report.closingCashBalance = parsed.data.closingCashBalance;
    report.totalIncome = totals.totalIncome;
    report.totalExpenses = totals.totalExpenses;
    report.netBalance = totals.netBalance;
    report.exchangeRate = exchangeRate;
    report.closingCashBalanceSAR = convertINRtoSAR(parsed.data.closingCashBalance, exchangeRate);
    report.totalIncomeSAR = convertINRtoSAR(totals.totalIncome, exchangeRate);
    report.totalExpensesSAR = convertINRtoSAR(totals.totalExpenses, exchangeRate);
    report.netBalanceSAR = convertINRtoSAR(totals.netBalance, exchangeRate);

    await report.save();

    await logAuditEntry({
      action: "Finance Report Updated",
      userId: user.id,
      userName: user.name,
      financeReportId: id,
      oldValue: previous,
      newValue: report.toObject()
    });

    return NextResponse.json({ success: true, data: report, message: "Finance report updated." });
  } catch (error) {
    console.error("Failed to update finance report", error);
    return NextResponse.json({ success: false, message: "Failed to update finance report" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    if (!canApproveFinanceReport(user)) {
      return NextResponse.json({ success: false, message: "Only CEO can delete finance reports" }, { status: 403 });
    }

    const { id } = await context.params;
    await connectToDatabase();
    const report = await FinanceReport.findById(id);

    if (!report) {
      return NextResponse.json({ success: false, message: "Finance report not found" }, { status: 404 });
    }

    if (report.status !== "pending") {
      return NextResponse.json({ success: false, message: "Only pending reports can be deleted" }, { status: 400 });
    }

    await report.deleteOne();

    await logAuditEntry({
      action: "Finance Report Deleted",
      userId: user.id,
      userName: user.name,
      financeReportId: id,
      oldValue: report.toObject()
    });

    return NextResponse.json({ success: true, message: "Finance report deleted." });
  } catch (error) {
    console.error("Failed to delete finance report", error);
    return NextResponse.json({ success: false, message: "Failed to delete finance report" }, { status: 500 });
  }
}
