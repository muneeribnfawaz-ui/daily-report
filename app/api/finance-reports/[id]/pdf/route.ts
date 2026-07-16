import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canViewFinanceReport } from "@/lib/permissions";
import FinanceReport from "@/models/FinanceReport";
import { buildFinanceReportPdfBuffer } from "@/lib/finance-pdf";

type RouteContext = { params: Promise<{ id: string }> };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LeanDoc = Record<string, any>;

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
    const report = await FinanceReport.findById(id).lean() as LeanDoc | null;

    if (!report) {
      return NextResponse.json({ success: false, message: "Finance report not found" }, { status: 404 });
    }

    const pdfBuffer = await buildFinanceReportPdfBuffer({
      reportDate: report.reportDate as Date,
      submittedByName: report.submittedByName as string,
      openingBalance: (report.openingBalance as number) || 0,
      cashReceived: (report.cashReceived as number) || 0,
      cardSales: (report.cardSales as number) || 0,
      onlinePayments: (report.onlinePayments as number) || 0,
      expenses: (report.expenses as number) || 0,
      refunds: (report.refunds as number) || 0,
      pettyCash: (report.pettyCash as number) || 0,
      bankDeposit: (report.bankDeposit as number) || 0,
      closingCashBalance: (report.closingCashBalance as number) || 0,
      totalIncome: (report.totalIncome as number) || 0,
      totalExpenses: (report.totalExpenses as number) || 0,
      netBalance: (report.netBalance as number) || 0,
      exchangeRate: (report.exchangeRate as number) || 0,
      closingCashBalanceSAR: (report.closingCashBalanceSAR as number) || 0,
      totalIncomeSAR: (report.totalIncomeSAR as number) || 0,
      totalExpensesSAR: (report.totalExpensesSAR as number) || 0,
      netBalanceSAR: (report.netBalanceSAR as number) || 0,
      status: (report.status as string) || "pending",
      approvedByName: (report.approvedByName as string) || "",
      approvedAt: report.approvedAt as Date | null
    });

    const dateStr = new Date(report.reportDate as Date).toISOString().slice(0, 10);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="finance-report-${dateStr}.pdf"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    console.error("Failed to generate finance report PDF", error);
    return NextResponse.json({ success: false, message: "Failed to generate PDF" }, { status: 500 });
  }
}
