import { NextResponse } from "next/server";
import db from "@/lib/db";
import { authorizeApi } from "@/lib/api-auth";
import { logAuditEntry } from "@/lib/audit";
import { getINRtoSARRate } from "@/lib/currency";
import { financeReportSchema } from "@/lib/validation";
import { canEditFinanceReport, canCreateMoneyRequest } from "@/lib/permissions";
import { encryptPayload, decryptPayload } from "@/lib/crypto";
import { isWorkspaceAuthorizedForUser } from "@/lib/workspace-context";

type RouteContext = { params: Promise<{ id: string }> };

async function findMoneyRequestByIdOrReportId(id: string) {
  const byId = await db.moneyRequest.findUnique({
    where: { id }
  });
  if (byId) return byId;

  return await db.moneyRequest.findFirst({
    where: { financeReportId: id }
  });
}

async function isForwardedToCEO(moneyRequest: any): Promise<boolean> {
  if (moneyRequest.status !== "pending") return true;
  if (moneyRequest.financeReportId) {
    const linkedReport = await db.financeReport.findUnique({
      where: { id: moneyRequest.financeReportId }
    });
    if (linkedReport && linkedReport.status !== "pending") {
      return true;
    }
  }
  return false;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const auth = await authorizeApi(["authenticated"]);
    if (!auth.authorized) return auth.response;
    const user = auth.user;

    const { id } = await context.params;
    const moneyRequest = await findMoneyRequestByIdOrReportId(String(id));

    if (!moneyRequest) {
      return NextResponse.json(
        { success: false, status: "NOT_FOUND", statusCode: 4004, message: "Money request not found" },
        { status: 404 }
      );
    }

    const isAuthorized = await isWorkspaceAuthorizedForUser(user, moneyRequest.workspaceId);
    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, status: "NOT_FOUND", statusCode: 4004, message: "Money request not found" },
        { status: 404 }
      );
    }

    const encryptedData = await encryptPayload(moneyRequest);
    return NextResponse.json({
      success: true,
      status: "SUCCESS",
      statusCode: 2000,
      message: "Money request fetched successfully",
      encryptedData,
      data: moneyRequest
    });
  } catch (error) {
    console.error("Failed to fetch money request", error);
    return NextResponse.json(
      { success: false, status: "ERROR", statusCode: 5000, message: "Failed to fetch money request" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const auth = await authorizeApi(["authenticated"]);
    if (!auth.authorized) return auth.response;
    const user = auth.user;

    const { id } = await context.params;
    const existing = await findMoneyRequestByIdOrReportId(String(id));

    if (!existing) {
      return NextResponse.json(
        { success: false, status: "NOT_FOUND", statusCode: 4004, message: "Money request not found" },
        { status: 404 }
      );
    }

    const isAuthorized = await isWorkspaceAuthorizedForUser(user, existing.workspaceId);
    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, status: "FORBIDDEN", statusCode: 4003, message: "Forbidden: You cannot edit a money request from another company/workspace." },
        { status: 403 }
      );
    }

    const canEdit = canEditFinanceReport(user) || canCreateMoneyRequest(user) || String(existing.submittedBy) === user.id;
    if (!canEdit) {
      return NextResponse.json(
        { success: false, status: "FORBIDDEN", statusCode: 4003, message: "Forbidden: You cannot edit this money request." },
        { status: 403 }
      );
    }

    if (await isForwardedToCEO(existing)) {
      return NextResponse.json(
        { success: false, status: "VALIDATION_ERROR", statusCode: 4001, message: "Money request cannot be edited after HOD has forwarded it to CEO" },
        { status: 400 }
      );
    }

    const rawBody = await request.json();
    let body = rawBody;
    if (rawBody.encryptedData) {
      try {
        body = await decryptPayload(rawBody.encryptedData);
      } catch (err) {
        return NextResponse.json(
          { success: false, status: "VALIDATION_ERROR", statusCode: 4001, message: "Failed to decrypt payload" },
          { status: 400 }
        );
      }
    }

    const parsed = financeReportSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Invalid payload";
      return NextResponse.json(
        { success: false, status: "VALIDATION_ERROR", statusCode: 4001, message: firstError },
        { status: 400 }
      );
    }

    const item = parsed.data.nextDayApprovals?.[0];
    if (!item) {
      return NextResponse.json(
        { success: false, status: "VALIDATION_ERROR", statusCode: 4001, message: "At least one money request item is required" },
        { status: 400 }
      );
    }

    const exchangeRate = await getINRtoSARRate();
    const reportDateStr = parsed.data.reportDate || new Date().toISOString().slice(0, 10);
    const dayStart = new Date(`${reportDateStr}T00:00:00.000Z`);

    const updated = await db.moneyRequest.update({
      where: { id: existing.id },
      data: {
        reportDate: dayStart,
        particulars: item.particulars || "N/A",
        description: item.description || "",
        amountINR: Number(item.amountINR) || 0,
        amountSAR: (Number(item.amountINR) || 0) * exchangeRate,
        priority: item.priority || "medium",
        bankName: item.bankName || ""
      }
    });

    await logAuditEntry({
      action: "Money Request Updated",
      userId: user.id,
      userName: user.name,
      oldValue: existing,
      newValue: updated
    });

    const encryptedData = await encryptPayload(updated);
    return NextResponse.json({
      success: true,
      status: "SUCCESS",
      statusCode: 2000,
      message: "Money request updated successfully.",
      encryptedData,
      data: updated
    });
  } catch (error) {
    console.error("Failed to update money request", error);
    return NextResponse.json(
      { success: false, status: "ERROR", statusCode: 5000, message: "Failed to update money request" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const auth = await authorizeApi(["authenticated"]);
    if (!auth.authorized) return auth.response;
    const user = auth.user;

    const { id } = await context.params;
    const existing = await findMoneyRequestByIdOrReportId(String(id));

    if (!existing) {
      return NextResponse.json(
        { success: false, status: "NOT_FOUND", statusCode: 4004, message: "Money request not found" },
        { status: 404 }
      );
    }

    const isAuthorized = await isWorkspaceAuthorizedForUser(user, existing.workspaceId);
    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, status: "FORBIDDEN", statusCode: 4003, message: "Forbidden: You cannot delete a money request from another company/workspace." },
        { status: 403 }
      );
    }

    const canDelete = canEditFinanceReport(user) || canCreateMoneyRequest(user) || String(existing.submittedBy) === user.id;
    if (!canDelete) {
      return NextResponse.json(
        { success: false, status: "FORBIDDEN", statusCode: 4003, message: "Forbidden: You cannot delete this money request." },
        { status: 403 }
      );
    }

    if (await isForwardedToCEO(existing)) {
      return NextResponse.json(
        { success: false, status: "VALIDATION_ERROR", statusCode: 4001, message: "Money request cannot be deleted after HOD has forwarded it to CEO" },
        { status: 400 }
      );
    }

    await db.moneyRequest.delete({
      where: { id: existing.id }
    });

    await logAuditEntry({
      action: "Money Request Deleted",
      userId: user.id,
      userName: user.name,
      oldValue: existing
    });

    return NextResponse.json({
      success: true,
      status: "SUCCESS",
      statusCode: 2000,
      message: "Money request deleted successfully."
    });
  } catch (error) {
    console.error("Failed to delete money request", error);
    return NextResponse.json(
      { success: false, status: "ERROR", statusCode: 5000, message: "Failed to delete money request" },
      { status: 500 }
    );
  }
}
