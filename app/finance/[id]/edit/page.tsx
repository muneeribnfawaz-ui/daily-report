import { redirect, notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPageHeader } from "@/components/dashboard/ui";
import { getCurrentUser } from "@/lib/auth";
import { canEditFinanceReport } from "@/lib/permissions";
import db from "@/lib/db";
import { FinanceReportForm } from "@/components/finance/finance-report-form";

type PageProps = { params: Promise<{ id: string }> };

export default async function FinanceEditPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canEditFinanceReport(user)) redirect("/finance");

  const { id } = await params;
  
  let report: any;
  try {
    report = await db.financeReport.findUnique({
      where: { id },
      include: {
        items: true,
        bankBalances: true
      }
    });
  } catch (error) {
    console.error("Error fetching finance report for edit:", error);
    notFound();
  }

  if (!report) notFound();

  // Only the user who created the report (or Admin/CEO) can edit it
  if (user.role !== "admin" && user.role !== "ceo" && String(report.submittedBy) !== user.id) {
    redirect(`/finance/${id}`);
  }

  // Only pending reports can be edited
  if (report.status !== "pending") {
    redirect(`/finance/${id}`);
  }

  const txs = report.items || [];
  const mapTx = (t: any) => ({
    ...t,
    _id: t.id,
    bankAccountId: t.bankName || "",
    bankName: t.bankName || ""
  });
  
  const expenses = txs.filter((t: any) => t.type === "expense").map(mapTx);
  const receipts = txs.filter((t: any) => t.type === "receipt").map(mapTx);
  const payments = txs.filter((t: any) => t.type === "payment").map(mapTx);
  const nextDayApprovals = txs.filter((t: any) => t.type === "next_day").map(mapTx);

  const totalExpenses = expenses.reduce((sum: number, item: any) => sum + (Number(item.amountINR) || 0), 0);
  const totalReceipts = receipts.reduce((sum: number, item: any) => sum + (Number(item.amountINR) || 0), 0);
  const totalPayments = payments.reduce((sum: number, item: any) => sum + (Number(item.amountINR) || 0), 0);
  const bankBalancesList = report.bankBalances || [];
  const bankBalance = bankBalancesList.reduce((sum: number, b: any) => sum + (Number(b.closingBalance) || 0), 0);
  
  // Try to extract cash closing balance from bank balances if it exists
  const cashObj = bankBalancesList.find((b: any) => b.bankName === "Cash");
  const pettyCashBalance = cashObj ? (Number(cashObj.closingBalance) || 0) : 0;

  const serializedReport = {
    _id: report.id,
    reportDate: report.reportDate ? new Date(report.reportDate).toISOString().slice(0, 10) : "",
    expenses,
    receipts,
    payments,
    bankBalances: bankBalancesList,
    cashBalance: { pettyCash: pettyCashBalance, total: pettyCashBalance },
    nextDayApprovals,
    summary: { totalExpenses, totalReceipts, totalPayments, bankBalance, pettyCashBalance, description: "" },
    exchangeRate: report.exchangeRate || 0,
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
