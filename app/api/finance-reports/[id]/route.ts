import { NextResponse } from "next/server";
import { ApiResponse } from "@/lib/api-response";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canViewFinanceReport, canEditFinanceReport, canApproveFinanceReport } from "@/lib/permissions";
import { logAuditEntry } from "@/lib/audit";
import { syncReportCashToPettyCash } from "@/lib/petty-cash-sync";
import { financeReportSchema } from "@/lib/validation";
import { getINRtoSARRate, convertINRtoSAR } from "@/lib/currency";
import { encryptPayload, decryptPayload } from "@/lib/crypto";
import { isWorkspaceAuthorizedForUser } from "@/lib/workspace-context";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return ApiResponse.unauthorized();
    }

    if (!canViewFinanceReport(user)) {
      return ApiResponse.forbidden();
    }

    const { id } = await context.params;
    const report = await db.financeReport.findUnique({
      where: { id: String(id) },
      include: { items: true, bankBalances: true, statusHistory: true }
    }) as Record<string, unknown> | null;

    if (!report) {
      return ApiResponse.notFound("Finance report not found");
    }

    const isAuthorized = await isWorkspaceAuthorizedForUser(user, report.workspaceId as string);
    if (!isAuthorized) {
      return ApiResponse.notFound("Finance report not found");
    }

    const encryptedData = await encryptPayload(report);
    return ApiResponse.success(report, "Operation completed successfully", 1000, null, 200, encryptedData);
  } catch (error) {
    console.error("Failed to fetch finance report", error);
    return ApiResponse.serverError("Failed to fetch finance report");
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return ApiResponse.unauthorized();
    }

    if (!canEditFinanceReport(user)) {
      return ApiResponse.forbidden();
    }

    const { id } = await context.params;
    const report = await db.financeReport.findUnique({
      where: { id: String(id) },
      include: { items: true, bankBalances: true }
    });

    if (!report) {
      return ApiResponse.notFound("Finance report not found");
    }

    const isAuthorized = await isWorkspaceAuthorizedForUser(user, report.workspaceId);
    if (!isAuthorized) {
      return ApiResponse.forbidden("Forbidden: You cannot modify a finance report from another company/workspace.");
    }

    if (user.role !== "admin" && user.role !== "ceo" && String(report.submittedBy) !== user.id) {
      return ApiResponse.forbidden("Forbidden: You can only update your own report.");
    }

    if (report.status !== "pending") {
      return ApiResponse.error("Only pending reports can be edited", 4000, 400);
    }

    const rawBody = await request.json();
    let body = rawBody;
    if (rawBody.encryptedData) {
      try {
        body = await decryptPayload(rawBody.encryptedData);
      } catch (err) {
        return ApiResponse.error("Failed to decrypt payload", 4000, 400);
      }
    }

    const parsed = financeReportSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Invalid payload";
      return ApiResponse.validationError(firstError);
    }

    const previous = report;
    const exchangeRate = await getINRtoSARRate();

    // delete existing items and create new ones for simplicity since Prisma nested updates can be complex
    await db.financeReportItem.deleteMany({ where: { financeReportId: report.id } });
    await db.financeReportBankBalance.deleteMany({ where: { financeReportId: report.id } });

    const updatedReport = await db.financeReport.update({
      where: { id: report.id },
      data: {
        exchangeRate,
        description: parsed.data.summary?.description || "",
        editAccessGranted: false,
        bankBalances: {
          create: parsed.data.bankBalances?.map((b: any) => ({
            bankName: b.bankName,
            openingBalance: b.openingBalance,
            receipts: b.receipts,
            payments: b.payments,
            closingBalance: b.closingBalance
          })) ?? []
        },
        items: {
          create: [
            ...(parsed.data.expenses?.map((i: any) => ({
              particulars: i.particulars,
              description: i.description,
              amountINR: i.amountINR,
              amountSAR: i.amountSAR,
              priority: i.priority,
              bankName: i.bankName,
              paymentMode: i.paymentMode,
              revisedAmountINR: i.revisedAmountINR,
              revisedAmountSAR: i.revisedAmountSAR,
              revisionReference: i.revisionReference,
              approval: i.approval,
              type: "expense"
            })) ?? []),
            ...(parsed.data.receipts?.map((i: any) => ({
              particulars: i.particulars,
              description: i.description,
              amountINR: i.amountINR,
              amountSAR: i.amountSAR,
              priority: i.priority,
              bankName: i.bankName,
              paymentMode: i.paymentMode,
              revisedAmountINR: i.revisedAmountINR,
              revisedAmountSAR: i.revisedAmountSAR,
              revisionReference: i.revisionReference,
              approval: i.approval,
              type: "receipt"
            })) ?? []),
            ...(parsed.data.payments?.map((i: any) => ({
              particulars: i.particulars,
              description: i.description,
              amountINR: i.amountINR,
              amountSAR: i.amountSAR,
              priority: i.priority,
              bankName: i.bankName,
              paymentMode: i.paymentMode,
              revisedAmountINR: i.revisedAmountINR,
              revisedAmountSAR: i.revisedAmountSAR,
              revisionReference: i.revisionReference,
              approval: i.approval,
              type: "payment"
            })) ?? []),
            ...(parsed.data.nextDayApprovals?.map((i: any) => ({
              particulars: i.particulars,
              description: i.description,
              amountINR: i.amountINR,
              amountSAR: i.amountSAR,
              priority: i.priority,
              bankName: i.bankName,
              paymentMode: i.paymentMode,
              revisedAmountINR: i.revisedAmountINR,
              revisedAmountSAR: i.revisedAmountSAR,
              revisionReference: i.revisionReference,
              approval: i.approval,
              type: "next_day"
            })) ?? [])
          ]
        }
      }
    });

    // Sync Cash items to Petty Cash ledger immediately
    await syncReportCashToPettyCash(String(updatedReport.id));

    await logAuditEntry({
      action: "Finance Report Updated",
      userId: user.id,
      userName: user.name,
      financeReportId: id,
      oldValue: previous,
      newValue: updatedReport
    });

    const encryptedData = await encryptPayload(updatedReport);
    return ApiResponse.success(updatedReport, "Finance report updated.", 1000, null, 200, encryptedData);
  } catch (error) {
    console.error("Failed to update finance report", error);
    return ApiResponse.serverError("Failed to update finance report");
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return ApiResponse.unauthorized();
    }

    if (!canApproveFinanceReport(user)) {
      return ApiResponse.forbidden("Only CEO can delete finance reports");
    }

    const { id } = await context.params;
    const report = await db.financeReport.findUnique({
      where: { id: String(id) }
    });

    if (!report) {
      return ApiResponse.notFound("Finance report not found");
    }

    const isAuthorized = await isWorkspaceAuthorizedForUser(user, report.workspaceId);
    if (!isAuthorized) {
      return ApiResponse.forbidden("Forbidden: You cannot delete a finance report from another company/workspace.");
    }

    if (report.status !== "pending") {
      return ApiResponse.error("Only pending reports can be deleted", 4000, 400);
    }

    await db.financeReport.delete({
      where: { id: report.id }
    });

    await logAuditEntry({
      action: "Finance Report Deleted",
      userId: user.id,
      userName: user.name,
      financeReportId: id,
      oldValue: report
    });

    return ApiResponse.success(null, "Finance report deleted.");
  } catch (error) {
    console.error("Failed to delete finance report", error);
    return ApiResponse.serverError("Failed to delete finance report");
  }
}
