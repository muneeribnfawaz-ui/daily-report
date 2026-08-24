import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canViewFinanceReport, canEditFinanceReport, canApproveFinanceReport } from "@/lib/permissions";
import FinanceReport from "@/models/FinanceReport";
import { logAuditEntry } from "@/lib/audit";
import { financeReportSchema } from "@/lib/validation";
import { getINRtoSARRate, convertINRtoSAR } from "@/lib/currency";

type RouteContext = { params: Promise<{ id: string }> };



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
    const exchangeRate = await getINRtoSARRate();

    report.expenses = parsed.data.expenses;
    report.receipts = parsed.data.receipts;
    report.payments = parsed.data.payments;
    report.bankBalances = parsed.data.bankBalances;
    report.cashBalance = parsed.data.cashBalance;
    report.nextDayApprovals = parsed.data.nextDayApprovals;
    report.summary = parsed.data.summary;
    report.exchangeRate = exchangeRate;

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
