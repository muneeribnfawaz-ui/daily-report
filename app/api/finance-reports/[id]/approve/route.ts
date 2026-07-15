import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canApproveFinanceReport } from "@/lib/permissions";
import FinanceReport from "@/models/FinanceReport";
import Notification from "@/models/Notification";
import { logAuditEntry } from "@/lib/audit";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    if (!canApproveFinanceReport(user)) {
      return NextResponse.json({ success: false, message: "Only admins and CEO can approve/reject finance reports" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const action = body.action;

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ success: false, message: "Action must be 'approve' or 'reject'" }, { status: 400 });
    }

    await connectToDatabase();
    const report = await FinanceReport.findById(id);

    if (!report) {
      return NextResponse.json({ success: false, message: "Finance report not found" }, { status: 404 });
    }

    if (report.status !== "pending") {
      return NextResponse.json({ success: false, message: "This report has already been processed" }, { status: 400 });
    }

    const previous = report.toObject();

    if (action === "approve") {
      report.status = "approved";
      report.approvedBy = user.id;
      report.approvedByName = user.name;
      report.approvedAt = new Date();
    } else {
      report.status = "rejected";
      report.approvedBy = user.id;
      report.approvedByName = user.name;
      report.approvedAt = new Date();
      report.rejectionReason = body.reason || "";
    }

    await report.save();

    // Notify the submitter
    await Notification.create({
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
    });

    await logAuditEntry({
      action: action === "approve" ? "Finance Report Approved" : "Finance Report Rejected",
      userId: user.id,
      userName: user.name,
      financeReportId: id,
      oldValue: previous,
      newValue: report.toObject(),
      reason: body.reason || null
    });

    return NextResponse.json({
      success: true,
      data: report,
      message: action === "approve" ? "Finance report approved." : "Finance report rejected."
    });
  } catch (error) {
    console.error("Failed to process finance report approval", error);
    return NextResponse.json({ success: false, message: "Failed to process approval" }, { status: 500 });
  }
}
