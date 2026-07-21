import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canApproveFinanceReport, canForwardFinanceReport } from "@/lib/permissions";
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

    const { id } = await context.params;
    const body = await request.json();
    const action = body.action;

    if (action !== "approve" && action !== "reject" && action !== "forward") {
      return NextResponse.json({ success: false, message: "Action must be 'forward', 'approve', or 'reject'" }, { status: 400 });
    }

    if (action === "forward" && !canForwardFinanceReport(user)) {
      return NextResponse.json({ success: false, message: "Only Finance HOD can forward finance reports" }, { status: 403 });
    }

    if ((action === "approve" || action === "reject") && !canApproveFinanceReport(user)) {
      return NextResponse.json({ success: false, message: "Only CEO can approve/reject finance reports" }, { status: 403 });
    }

    await connectToDatabase();
    const report = await FinanceReport.findById(id);

    if (!report) {
      return NextResponse.json({ success: false, message: "Finance report not found" }, { status: 404 });
    }

    if (action === "forward" && report.status !== "pending") {
      return NextResponse.json({ success: false, message: "Can only forward pending reports" }, { status: 400 });
    }

    if ((action === "approve" || action === "reject") && report.status !== "forwarded_to_ceo") {
      return NextResponse.json({ success: false, message: "Report must be forwarded to CEO before it can be approved or rejected" }, { status: 400 });
    }

    const previous = report.toObject();

    if (action === "forward") {
      report.status = "forwarded_to_ceo";
      report.forwardedBy = user.id;
      report.forwardedByName = user.name;
      report.forwardedAt = new Date();
    } else if (action === "approve") {
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

    report.statusHistory = report.statusHistory || [];
    report.statusHistory.push({
      status: report.status,
      by: user.id,
      byName: user.name,
      timestamp: new Date()
    });

    await report.save();

    // Notify the submitter
    await Notification.create({
      recipientId: report.submittedBy,
      type: action === "forward" ? "finance_forwarded" : action === "approve" ? "finance_approved" : "finance_rejected",
      title: action === "forward" ? "Finance Report Forwarded" : action === "approve" ? "Finance Report Approved" : "Finance Report Rejected",
      message: action === "forward"
        ? `Your finance report for ${new Date(report.reportDate).toISOString().slice(0, 10)} has been forwarded to CEO by ${user.name}.`
        : action === "approve"
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

    if (action === "forward") {
      const ceoUsers = await User.find({
        role: "ceo",
        status: "active",
        isDeleted: false
      }).lean();

      const ceoNotifications = ceoUsers.map((ceoUser) => ({
        recipientId: ceoUser._id,
        type: "finance_approval_request",
        title: "Finance Report — Pending Approval",
        message: `${report.submittedByName} submitted a finance report for ${new Date(report.reportDate).toISOString().slice(0, 10)}. It was forwarded by ${user.name} and is awaiting your approval.`,
        metadata: {
          financeReportId: id,
          reportDate: report.reportDate,
          submittedBy: report.submittedByName,
          action,
          forwardedBy: user.name
        },
        linkUrl: `/finance/${id}`
      }));

      if (ceoNotifications.length > 0) {
        await Notification.insertMany(ceoNotifications);
      }
    }

    await logAuditEntry({
      action: action === "forward" ? "Finance Report Forwarded" : action === "approve" ? "Finance Report Approved" : "Finance Report Rejected",
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
      message: action === "forward" ? "Finance report forwarded." : action === "approve" ? "Finance report approved." : "Finance report rejected."
    });
  } catch (error) {
    console.error("Failed to process finance report approval", error);
    return NextResponse.json({ success: false, message: "Failed to process approval" }, { status: 500 });
  }
}
