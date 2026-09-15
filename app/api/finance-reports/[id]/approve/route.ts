import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canApproveFinanceReport } from "@/lib/permissions";
import { logAuditEntry } from "@/lib/audit";
import { syncReportCashToPettyCash } from "@/lib/petty-cash-sync";
import { encryptPayload, decryptPayload } from "@/lib/crypto";
import { isWorkspaceAuthorizedForUser } from "@/lib/workspace-context";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const rawBody = await request.json();
    let body = rawBody;
    if (rawBody.encryptedData) {
      try {
        body = await decryptPayload(rawBody.encryptedData);
      } catch (err) {
        return NextResponse.json({ success: false, message: "Failed to decrypt payload" }, { status: 400 });
      }
    }
    const action = body.action;

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ success: false, message: "Action must be 'approve' or 'reject'" }, { status: 400 });
    }

    if (!canApproveFinanceReport(user) && user.role !== "admin") {
      return NextResponse.json({ success: false, message: "Only CEO or Admin can approve/reject finance reports" }, { status: 403 });
    }

    const report = await db.financeReport.findUnique({
      where: { id: String(id) },
      include: { statusHistory: true, items: true }
    });

    if (!report) {
      return NextResponse.json({ success: false, message: "Finance report not found" }, { status: 404 });
    }

    const isAuthorized = await isWorkspaceAuthorizedForUser(user, report.workspaceId);
    if (!isAuthorized) {
      return NextResponse.json({ success: false, message: "Forbidden: You cannot review a finance report from another company/workspace." }, { status: 403 });
    }

    if (report.status !== "pending" && report.status !== "forwarded_to_ceo") {
      return NextResponse.json({ success: false, message: "Only pending finance reports can be approved or rejected" }, { status: 400 });
    }

    const previous = report;
    const updateData: any = {
      statusHistory: {
        create: {
          status: action === "approve" ? "approved" : "rejected",
          by: user.id,
          byName: user.name,
          timestamp: new Date()
        }
      }
    };

    if (action === "approve") {
      updateData.status = "approved";
      updateData.approvedBy = user.id;
      updateData.approvedByName = user.name;
      updateData.approvedAt = new Date();
    } else {
      updateData.status = "rejected";
      updateData.approvedBy = user.id;
      updateData.approvedByName = user.name;
      updateData.approvedAt = new Date();
      updateData.rejectionReason = body.reason || "";
    }

    const updatedReport = await db.financeReport.update({
      where: { id: report.id },
      data: updateData
    });

    // Keep Petty Cash system synced with report items
    await syncReportCashToPettyCash(report.id);

    // Notify the submitter
    await db.notification.create({
      data: {
        recipientId: report.submittedBy,
        type: action === "approve" ? "finance_approved" : "finance_rejected",
        title: action === "approve" ? "Finance Report Approved" : "Finance Report Rejected",
        message: action === "approve"
          ? `Your finance report for ${new Date(report.reportDate).toISOString().slice(0, 10)} has been approved by ${user.name}.`
          : `Your finance report for ${new Date(report.reportDate).toISOString().slice(0, 10)} has been rejected by ${user.name}. Reason: ${body.reason || "No reason provided."}`,
        metadata: {
          financeReportId: id,
          reportDate: report.reportDate,
          action,
          approvedBy: user.name
        },
        linkUrl: `/finance/${id}`
      }
    });

    await logAuditEntry({
      action: action === "approve" ? "Finance Report Approved" : "Finance Report Rejected",
      userId: user.id,
      userName: user.name,
      financeReportId: id,
      oldValue: previous,
      newValue: updatedReport,
      reason: body.reason || null
    });

    const encryptedData = await encryptPayload(updatedReport);
    return NextResponse.json({
      success: true,
      encryptedData,
      data: updatedReport,
      message: action === "approve" ? "Finance report approved." : "Finance report rejected."
    });
  } catch (error) {
    console.error("Failed to process finance report approval", error);
    return NextResponse.json({ success: false, message: "Failed to process approval" }, { status: 500 });
  }
}

