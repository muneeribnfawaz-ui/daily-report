import { NextResponse } from "next/server";
import db from "@/lib/db";
import { authorizeApi } from "@/lib/api-auth";
import { canApproveFinanceReport, canForwardFinanceReport } from "@/lib/permissions";
import { logAuditEntry } from "@/lib/audit";
import { getINRtoSARRate } from "@/lib/currency";
import { encryptPayload, decryptPayload } from "@/lib/crypto";
import { getCeoUserIdsForWorkspace } from "@/lib/notifications";
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

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await authorizeApi(["authenticated"]);
    if (!auth.authorized) return auth.response;
    const user = auth.user;

    const { id } = await context.params;
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
    const action = body.action; // "forward" | "approve" | "reject"

    if (action !== "approve" && action !== "reject" && action !== "forward") {
      return NextResponse.json(
        { success: false, status: "VALIDATION_ERROR", statusCode: 4001, message: "Action must be 'forward', 'approve', or 'reject'" },
        { status: 400 }
      );
    }

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
        { success: false, status: "FORBIDDEN", statusCode: 4003, message: "Forbidden: You cannot review a money request from another company/workspace." },
        { status: 403 }
      );
    }

    if (moneyRequest.status === "approved" || moneyRequest.status === "rejected") {
      return NextResponse.json(
        { success: false, status: "VALIDATION_ERROR", statusCode: 4001, message: `Money request is already ${moneyRequest.status}.` },
        { status: 400 }
      );
    }

    const isHod = user.role === "hod" || canForwardFinanceReport(user);
    const isCeo = user.role === "ceo" || canApproveFinanceReport(user) || user.role === "admin";

    if (!isHod && !isCeo) {
      return NextResponse.json(
        { success: false, status: "FORBIDDEN", statusCode: 4003, message: "Forbidden: Only HOD or CEO can review money requests" },
        { status: 403 }
      );
    }

    // Strict HOD Rule: HOD cannot directly approve, only forward to CEO or reject
    if (isHod && !isCeo && action === "approve") {
      return NextResponse.json(
        { success: false, status: "FORBIDDEN", statusCode: 4003, message: "For HOD, money requests can only be rejected or forwarded to CEO." },
        { status: 403 }
      );
    }

    if (action === "forward" && !isHod && !isCeo) {
      return NextResponse.json(
        { success: false, status: "FORBIDDEN", statusCode: 4003, message: "Only HOD can forward money requests to CEO" },
        { status: 403 }
      );
    }

    if (action === "forward" && moneyRequest.status !== "pending") {
      return NextResponse.json(
        { success: false, status: "VALIDATION_ERROR", statusCode: 4001, message: "Only pending money requests can be forwarded to CEO." },
        { status: 400 }
      );
    }

    // Strict CEO Rule: CEO cannot approve, revise, or reject before HOD has forwarded it
    if (user.role === "ceo" && (action === "approve" || action === "reject") && moneyRequest.status !== "forwarded_to_ceo") {
      return NextResponse.json(
        {
          success: false,
          status: "FORBIDDEN",
          statusCode: 4003,
          message: "CEO cannot approve, revise, or reject a money request before HOD has forwarded it."
        },
        { status: 403 }
      );
    }

    let newStatus = moneyRequest.status;
    let revisedAmountINR: number | null = moneyRequest.revisedAmountINR;
    let revisedAmountSAR: number | null = moneyRequest.revisedAmountSAR;
    let revisionReference: string = moneyRequest.revisionReference || "";

    if (action === "forward") {
      newStatus = "forwarded_to_ceo";
    } else if (action === "approve") {
      newStatus = "approved";

      // If CEO/Admin provided a revised amount
      if (body.revisedAmountINR !== undefined && body.revisedAmountINR !== null) {
        const valINR = Number(body.revisedAmountINR);
        if (!isNaN(valINR) && valINR >= 0) {
          const rate = await getINRtoSARRate();
          revisedAmountINR = valINR;
          revisedAmountSAR = Math.round(valINR * rate * 100) / 100;
          if (body.revisionReference && typeof body.revisionReference === "string") {
            revisionReference = body.revisionReference.trim();
          } else if (!revisionReference) {
            revisionReference = "Executive Revision";
          }
        }
      }
    } else if (action === "reject") {
      if (!body.reason || typeof body.reason !== "string" || !body.reason.trim()) {
        return NextResponse.json(
          { success: false, status: "VALIDATION_ERROR", statusCode: 4001, message: "Rejection reason is required when rejecting a money request." },
          { status: 400 }
        );
      }
      newStatus = "rejected";
    }

    const updated = await db.moneyRequest.update({
      where: { id: moneyRequest.id },
      data: {
        status: newStatus,
        reviewedBy: user.id,
        reviewedByName: user.name,
        reviewedAt: new Date(),
        reviewComment: body.reason ? body.reason.trim() : body.revisionReference ? body.revisionReference.trim() : moneyRequest.reviewComment || "",
        revisedAmountINR,
        revisedAmountSAR,
        revisionReference
      }
    });

    // Notify submitter
    await db.notification.create({
      data: {
        recipientId: moneyRequest.submittedBy,
        type: action === "forward" ? "money_request_forwarded" : action === "approve" ? "money_request_approved" : "money_request_rejected",
        title: action === "forward" ? "Money Request Forwarded" : action === "approve" ? "Money Request Approved" : "Money Request Rejected",
        message: action === "forward"
          ? `Your money request for ${moneyRequest.particulars} has been forwarded to CEO by ${user.name}.`
          : action === "approve"
          ? `Your money request for ${moneyRequest.particulars} has been approved by ${user.name}.`
          : `Your money request for ${moneyRequest.particulars} has been rejected by ${user.name}. Reason: ${body.reason || "No reason provided."}`,
        metadata: {
          moneyRequestId: moneyRequest.id,
          particulars: moneyRequest.particulars,
          action,
          reviewedBy: user.name
        },
        linkUrl: `/finance/requests`
      }
    });

    // If forwarded by HOD, notify CEO users for this workspace
    if (action === "forward") {
      const ceoRecipientIds = await getCeoUserIdsForWorkspace(moneyRequest.workspaceId);
      const validCeoIds = ceoRecipientIds.filter((id) => id !== user.id);

      const ceoNotifications = validCeoIds.map((ceoId) => ({
        recipientId: ceoId,
        type: "money_request_approval_request",
        title: "Money Request — Pending CEO Approval",
        message: `${moneyRequest.submittedByName} submitted a money request for ${moneyRequest.particulars} (₹${Number(moneyRequest.amountINR).toLocaleString("en-IN")}). It was forwarded by ${user.name} and is awaiting your approval.`,
        metadata: {
          moneyRequestId: moneyRequest.id,
          particulars: moneyRequest.particulars,
          submittedBy: moneyRequest.submittedByName,
          action,
          forwardedBy: user.name,
          workspaceId: moneyRequest.workspaceId
        },
        linkUrl: `/finance/requests/${moneyRequest.id}`
      }));
      if (ceoNotifications.length > 0) {
        await db.notification.createMany({ data: ceoNotifications });
      }
    }

    await logAuditEntry({
      action: action === "forward" ? "Money Request Forwarded" : action === "approve" ? "Money Request Approved" : "Money Request Rejected",
      userId: user.id,
      userName: user.name,
      oldValue: moneyRequest,
      newValue: updated,
      reason: body.reason || null
    });

    const encryptedData = await encryptPayload(updated);
    return NextResponse.json({
      success: true,
      status: "SUCCESS",
      statusCode: 2000,
      message: action === "forward" ? "Money request forwarded to CEO." : action === "approve" ? "Money request approved." : "Money request rejected.",
      encryptedData,
      data: updated
    });
  } catch (error) {
    console.error("Failed to process money request approval action", error);
    return NextResponse.json(
      { success: false, status: "ERROR", statusCode: 5000, message: "Failed to process approval action" },
      { status: 500 }
    );
  }
}
