import { NextResponse } from "next/server";
import { ApiResponse } from "@/lib/api-response";
import db from "@/lib/db";
import { financeReportSchema } from "@/lib/validation";
import { getCurrentUser } from "@/lib/auth";
import { canCreateFinanceReport, canViewFinanceReport } from "@/lib/permissions";
import { logAuditEntry } from "@/lib/audit";
import { syncReportCashToPettyCash } from "@/lib/petty-cash-sync";
import { getINRtoSARRate, convertINRtoSAR } from "@/lib/currency";
import { encryptPayload, decryptPayload } from "@/lib/crypto";


export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return ApiResponse.unauthorized();
    }

    if (!canCreateFinanceReport(user)) {
      return ApiResponse.forbidden("You do not have permission to create finance reports");
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
      const firstError = parsed.error.issues[0]?.message || "Invalid finance report payload";
      return ApiResponse.validationError(firstError);
    }

    const workspaceId = parsed.data.workspaceId && parsed.data.workspaceId !== "all"
      ? parsed.data.workspaceId
      : user.workspaceId;

    if (!workspaceId) {
      return ApiResponse.validationError("Workspace context is required. Please refresh.");
    }

    
    // Check for existing report on the same date
    const reportDate = new Date(parsed.data.reportDate);
    const dayStart = new Date(reportDate);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const existingReport = await db.financeReport.findFirst({
      where: { 
        workspaceId,
        submittedBy: user.id,
        reportDate: { gte: dayStart, lt: dayEnd } 
      }
    });

    // Fetch exchange rate
    const exchangeRate = await getINRtoSARRate();

    const isMoneyRequest =
      Boolean(parsed.data.nextDayApprovals && parsed.data.nextDayApprovals.length > 0) &&
      (!parsed.data.expenses || parsed.data.expenses.length === 0) &&
      (!parsed.data.receipts || parsed.data.receipts.length === 0) &&
      (!parsed.data.payments || parsed.data.payments.length === 0);

    if (existingReport) {
      if (isMoneyRequest) {
        // Store money requests exclusively in dedicated MoneyRequest table
        await db.moneyRequest.createMany({
          data: (parsed.data.nextDayApprovals || []).map((i: any) => ({
            workspaceId,
            submittedBy: user.id,
            submittedByName: user.name,
            reportDate: dayStart,
            particulars: i.particulars || "N/A",
            description: i.description || "",
            amountINR: Number(i.amountINR) || 0,
            amountSAR: (Number(i.amountINR) || 0) * exchangeRate,
            priority: i.priority || "medium",
            bankName: i.bankName || "",
            revisedAmountINR: i.revisedAmountINR ? Number(i.revisedAmountINR) : null,
            revisedAmountSAR: i.revisedAmountSAR ? Number(i.revisedAmountSAR) : null,
            revisionReference: i.revisionReference || "",
            status: i.approval || "pending",
            financeReportId: existingReport.id
          }))
        });

        await logAuditEntry({
          action: "Money Request Created",
          userId: user.id,
          userName: user.name,
          financeReportId: existingReport.id,
          newValue: parsed.data.nextDayApprovals
        });

        const encryptedData = await encryptPayload(existingReport);
        return ApiResponse.created(
          existingReport,
          "Money request submitted successfully!",
          2001,
          201,
          encryptedData
        );
      }

      return ApiResponse.error("A finance report already exists for this date. Please edit the existing report instead.", 4009, 409);
    }

    const reportPayload = {
      workspaceId,
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

    // Build properly formatted payload matching Prisma schema
    const prismaPayload = {
      workspaceId: reportPayload.workspaceId,
      reportDate: reportPayload.reportDate,
      submittedBy: reportPayload.submittedBy,
      submittedByName: reportPayload.submittedByName,
      exchangeRate: reportPayload.exchangeRate,
      status: reportPayload.status,
      bankBalances: {
        create: reportPayload.bankBalances?.map((b: any) => ({
          bankName: b.bankName,
          openingBalance: b.openingBalance,
          receipts: b.receipts,
          payments: b.payments,
          closingBalance: b.closingBalance
        })) ?? []
      },
      items: {
        create: [
          ...(reportPayload.expenses?.map((i: any) => ({
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
          ...(reportPayload.receipts?.map((i: any) => ({
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
          ...(reportPayload.payments?.map((i: any) => ({
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
          })) ?? [])
        ]
      },
      statusHistory: {
        create: reportPayload.statusHistory
      }
    };

    const report = await db.financeReport.create({ data: prismaPayload });

    if (parsed.data.nextDayApprovals && parsed.data.nextDayApprovals.length > 0) {
      await db.moneyRequest.createMany({
        data: parsed.data.nextDayApprovals.map((i: any) => ({
          workspaceId,
          submittedBy: user.id,
          submittedByName: user.name,
          reportDate: dayStart,
          particulars: i.particulars || "N/A",
          description: i.description || "",
          amountINR: Number(i.amountINR) || 0,
          amountSAR: (Number(i.amountINR) || 0) * exchangeRate,
          priority: i.priority || "medium",
          bankName: i.bankName || "",
          revisedAmountINR: i.revisedAmountINR ? Number(i.revisedAmountINR) : null,
          revisedAmountSAR: i.revisedAmountSAR ? Number(i.revisedAmountSAR) : null,
          revisionReference: i.revisionReference || "",
          status: i.approval || "pending",
          financeReportId: String(report.id)
        }))
      });
    }

    // Sync Cash items to Petty Cash ledger immediately
    await syncReportCashToPettyCash(String(report.id));

    // Create notifications for Finance HODs
    const financeHods = await db.user.findMany({
      where: {
        role: "hod",
        isDeleted: false,
        workspaceMembers: {
          some: {
            OR: [
              { departments: { some: { name: "Finance" } } }
            ],
            status: "active",
            isActive: true
          }
        }
      }
    });

    const notifications = financeHods.map((hodUser) => ({
      recipientId: hodUser.id,
      type: "finance_approval_request",
      title: "Finance Report — Pending Forward",
      message: `${user.name} submitted a finance report for ${dayStart.toISOString().slice(0, 10)}. Closing Balance: ₹${parsed.data.summary.bankBalance.toLocaleString("en-IN")}. Awaiting your approval.`,
      metadata: {
        financeReportId: String(report.id),
        reportDate: dayStart.toISOString(),
        submittedBy: user.name,
        totalIncome: parsed.data.summary.totalReceipts,
        closingCashBalance: parsed.data.summary.bankBalance
      },
      linkUrl: `/finance/${String(report.id)}`
    }));

    if (notifications.length > 0) {
      await db.notification.createMany({ data: notifications });
    }

    await logAuditEntry({
      action: "Finance Report Created",
      userId: user.id,
      userName: user.name,
      financeReportId: String(report.id),
      newValue: reportPayload
    });

    const encryptedData = await encryptPayload(report);
    return ApiResponse.created(report, "Finance report submitted successfully.", 2001, 201, encryptedData);
  } catch (error) {
    console.error("Failed to create finance report", error);
    return ApiResponse.serverError("Failed to create finance report");
  }
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return ApiResponse.unauthorized();
    }

    if (!canViewFinanceReport(user)) {
      return ApiResponse.forbidden("You do not have permission to view finance reports");
    }

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const date = url.searchParams.get("date");
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 100);
    const workspaceId = url.searchParams.get("workspaceId") || request.headers.get("x-workspace-id") || user.workspaceId;

        const filter: Record<string, any> = {};

    if (user.role !== "admin") {
      const memberships = await db.workspaceMember.findMany({ where: { userId: user.id, status: "active", isActive: true }, select: { workspaceId: true } });
      const allowedWorkspaceIds = memberships.map(m => String(m.workspaceId));

      if (workspaceId && workspaceId !== "all") {
        filter.workspaceId = allowedWorkspaceIds.includes(workspaceId) ? workspaceId : "non_existent_id";
      } else {
        filter.workspaceId = { in: allowedWorkspaceIds };
      }
    } else {
      if (workspaceId && workspaceId !== "all") {
        filter.workspaceId = workspaceId;
      }
    }

    const submittedByParam = url.searchParams.get("submittedBy");
    if (submittedByParam) {
      filter.submittedBy = submittedByParam === "me" ? user.id : submittedByParam;
    }

    if (status) {
      filter.status = status;
    } else if (user.role === "ceo") {
      filter.status = { in: ["forwarded_to_ceo", "approved", "rejected"] };
    }
    if (date) {
      const day = new Date(date);
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);
      filter.reportDate = { gte: day, lt: nextDay };
    }

    const reports = await db.financeReport.findMany({
      where: filter,
      orderBy: { reportDate: 'desc' },
      take: limit
    });

    const encryptedData = await encryptPayload(reports);
    return ApiResponse.success(reports, "Operation completed successfully", 1000, null, 200, encryptedData);
  } catch (error) {
    console.error("Failed to fetch finance reports", error);
    return ApiResponse.serverError("Failed to fetch finance reports");
  }
}
