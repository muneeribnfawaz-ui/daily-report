import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canViewFinanceReport } from "@/lib/permissions";
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
        const report = await db.financeReport.findUnique({
          where: { id: String(id) },
          include: { items: true, bankBalances: true }
        }) as LeanDoc | null;

    if (!report) {
      return NextResponse.json({ success: false, message: "Finance report not found" }, { status: 404 });
    }

    const items = (report.items as any[]) || [];
    const expensesTotal = items.filter(i => i.type === "expense" || i.type === "payment").reduce((s, i) => s + (i.amountINR || 0), 0);
    const receiptsTotal = items.filter(i => i.type === "receipt").reduce((s, i) => s + (i.amountINR || 0), 0);
    const paymentsTotal = items.filter(i => i.type === "payment").reduce((s, i) => s + (i.amountINR || 0), 0);
    const bankBalanceTotal = (report.bankBalances as any[] || []).reduce((s, b) => s + (b.closingBalance || 0), 0);

    const pdfBuffer = await buildFinanceReportPdfBuffer({
      reportDate: report.reportDate as Date,
      submittedByName: report.submittedByName as string,
      expenses: items.filter(i => i.type === "expense"),
      receipts: items.filter(i => i.type === "receipt"),
      payments: items.filter(i => i.type === "payment"),
      bankBalances: (report.bankBalances as any[]) || [],
      cashBalance: { pettyCash: 0, total: 0 },
      nextDayApprovals: items.filter(i => i.type === "next_day"),
      summary: {
        totalExpenses: expensesTotal,
        totalReceipts: receiptsTotal,
        totalPayments: paymentsTotal,
        bankBalance: bankBalanceTotal,
        pettyCashBalance: 0,
        description: ""
      },
      exchangeRate: (report.exchangeRate as number) || 0,
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
