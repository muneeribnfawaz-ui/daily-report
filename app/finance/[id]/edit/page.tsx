import { redirect, notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { getCurrentUser } from "@/lib/auth";
import { canEditFinanceReport } from "@/lib/permissions";
import { connectToDatabase } from "@/lib/db";
import FinanceReport from "@/models/FinanceReport";
import { FinanceReportForm } from "@/components/finance/finance-report-form";

type PageProps = { params: Promise<{ id: string }> };

export default async function FinanceEditPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canEditFinanceReport(user)) redirect("/finance");

  const { id } = await params;
  await connectToDatabase();

  let report: any;
  try {
    report = await FinanceReport.findById(id).lean();
  } catch {
    notFound();
  }

  if (!report) notFound();

  // Only pending reports can be edited
  if (report.status !== "pending") {
    redirect(`/finance/${id}`);
  }

  const serializedReport = {
    _id: String(report._id),
    reportDate: report.reportDate ? new Date(report.reportDate).toISOString().slice(0, 10) : "",
    openingBalance: (report.openingBalance as number) || 0,
    cashReceived: (report.cashReceived as number) || 0,
    cardSales: (report.cardSales as number) || 0,
    onlinePayments: (report.onlinePayments as number) || 0,
    expenses: (report.expenses as number) || 0,
    refunds: (report.refunds as number) || 0,
    pettyCash: (report.pettyCash as number) || 0,
    bankDeposit: (report.bankDeposit as number) || 0,
    closingCashBalance: (report.closingCashBalance as number) || 0,
  };

  return (
    <AppShell title="Edit Finance Report" role={user.role}>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Finance"
          title="Edit Finance Report"
          description="Modify today's financial data. All fields accept numeric values in INR. Totals are calculated automatically."
        />
        <FinanceReportForm mode="edit" initialData={serializedReport} />
      </div>
    </AppShell>
  );
}
