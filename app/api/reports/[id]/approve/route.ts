import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logAuditEntry } from "@/lib/audit";
import { getVisibleReportEmployeeIds } from "@/lib/report-visibility";
import { isReportDateToday } from "@/lib/report-edit-access";


export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "team_lead" && user.role !== "report_manager" && user.role !== "hod" && user.role !== "admin" && user.role !== "ceo")) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;
    if (!id) {
      return NextResponse.json({ success: false, message: "Report ID is required" }, { status: 400 });
    }

    const report = await db.dailyReport.findUnique({ where: { id: String(id) } });

    if (!report) {
      return NextResponse.json({ success: false, message: "Report not found" }, { status: 404 });
    }

    if (String(report.employeeId) === user.id) {
      return NextResponse.json({ success: false, message: "You cannot review or verify your own report." }, { status: 400 });
    }

    const authorUser = report.employeeId ? await db.user.findUnique({ where: { id: report.employeeId } }) : null;
    const authorMember = report.employeeId ? await db.workspaceMember.findFirst({
      where: { userId: report.employeeId, isActive: true }
    }) as any : null;
    const authorRole = (authorMember?.role || authorUser?.role || "team_member").toLowerCase();

    const body = await request.json().catch(() => ({}));
    const action = body.action === "reject" ? "reject" : "approve";
    const reviewNotes = typeof body.reviewNotes === "string" ? body.reviewNotes.trim() : "";
    const rejectionReason = typeof body.rejectionReason === "string" ? body.rejectionReason.trim() : "";

    // Report Manager review flow
    if (user.role === "report_manager") {
      if (authorRole !== "team_lead") {
        return NextResponse.json({ success: false, message: "Report Managers can only review reports submitted by Team Leads." }, { status: 400 });
      }

      if (!isReportDateToday(report.reportDate)) {
        return NextResponse.json({ success: false, message: "Report Managers can only review reports on the date they are submitted." }, { status: 400 });
      }

      const visibleEmployeeIds = await getVisibleReportEmployeeIds({
        ...user,
        workspaceId: user.workspaceId || report.workspaceId
      });
      if (visibleEmployeeIds && !visibleEmployeeIds.includes(String(report.employeeId))) {
        return NextResponse.json({ success: false, message: "You are not authorized to review reports from this department." }, { status: 403 });
      }

      const managerRemark = reviewNotes || rejectionReason;
      if (!managerRemark) {
        return NextResponse.json({ success: false, message: "A remark or reason is mandatory for Report Manager review." }, { status: 400 });
      }

      const previousState = report;
      const updatedReport = await db.dailyReport.update({
        where: { id: report.id },
        data: {
          reportManagerStatus: action === "approve" ? "approved" : "rejected",
          reportManagerReview: managerRemark,
          reportManagerReviewedBy: user.id || null,
          reportManagerReviewedByName: user.name || "",
          reportManagerReviewedAt: new Date()
        } as any
      });

      try {
        await logAuditEntry({
          action: action === "approve" ? "Report Manager Approved" : "Report Manager Rejected",
          userId: user.id,
          userName: user.name,
          reportId: id,
          oldValue: previousState,
          newValue: updatedReport
        });
      } catch (auditErr) {
        console.error("[AUDIT_LOG_ERROR]", auditErr);
      }

      if (report.employeeId && String(report.employeeId) !== user.id) {
        try {
          await db.notification.create({
            data: {
              recipientId: report.employeeId,
              type: action === "approve" ? "report_verified" : "report_rejected",
              title: action === "approve" ? "Report Manager Approved Report" : "Report Manager Rejected Report",
              message: `Your report for ${new Date(report.reportDate).toLocaleDateString()} was reviewed by Report Manager ${user.name}. ${action === "approve" ? "Remark" : "Reason"}: "${managerRemark}"`,
              linkUrl: `/daily-report/my-reports`
            }
          });
        } catch (notifErr) {
          console.error("[NOTIFICATION_ERROR]", notifErr);
        }
      }

      return NextResponse.json({ success: true, data: updatedReport });
    }

    // Existing Team Lead and Senior verification flow
    if (user.role === "team_lead") {
      if (report.verificationLevel) {
        return NextResponse.json({ success: false, message: "This report has already been verified." }, { status: 400 });
      }
    }

    if (user.role === "hod") {
      if (!isReportDateToday(report.reportDate)) {
        return NextResponse.json(
          { success: false, message: "HOD can only verify reports on the date they are submitted." },
          { status: 400 }
        );
      }

      if (authorRole !== "team_lead") {
        if (report.verificationLevel === "tl" || report.verificationLevel === "hod" || report.verificationLevel === "ceo") {
          return NextResponse.json(
            { success: false, message: "This Team Member report was already verified by Team Lead. Re-verification by HOD is not required." },
            { status: 400 }
          );
        }
      } else {
        if (report.verificationLevel === "hod" || report.verificationLevel === "ceo") {
          return NextResponse.json(
            { success: false, message: "This Team Lead report has already been verified by HOD." },
            { status: 400 }
          );
        }
      }
    }

    if (action === "reject" && !rejectionReason && !reviewNotes) {
      return NextResponse.json({ success: false, message: "Please provide a rejection reason or review notes." }, { status: 400 });
    }

    const previousState = report;

    const updatedReport = await db.dailyReport.update({
      where: { id: report.id },
      data: {
        status: action === "approve" ? "approved" : "rejected",
        approvedBy: action === "approve" ? user.id : undefined,
        approvedAt: action === "approve" ? new Date() : undefined,
        rejectionReason: action === "approve" ? "" : (rejectionReason || reviewNotes),
        reviewNotes,
        reviewedBy: user.id,
        reviewedByName: user.name,
        reviewedAt: new Date(),
        verificationLevel: user.role
      }
    });

    try {
      await logAuditEntry({
        action: action === "approve" ? "Report Approved/Verified" : "Report Rejected",
        userId: user.id,
        userName: user.name,
        reportId: id,
        oldValue: previousState,
        newValue: updatedReport
      });
    } catch (auditErr) {
      console.error("[AUDIT_LOG_ERROR]", auditErr);
    }

    if (report.employeeId && String(report.employeeId) !== user.id) {
      try {
        await db.notification.create({
          data: {
            recipientId: report.employeeId,
            type: action === "approve" ? "report_verified" : "report_rejected",
            title: action === "approve" ? "Daily Report Verified" : "Daily Report Rejected",
            message: action === "approve"
              ? `Your report for ${new Date(report.reportDate).toLocaleDateString()} was verified by ${user.name} (${user.role.toUpperCase()}).${reviewNotes ? ` Notes: "${reviewNotes}"` : ""}`
              : `Your report for ${new Date(report.reportDate).toLocaleDateString()} was rejected by ${user.name}. Reason: "${rejectionReason || reviewNotes}"`,
            linkUrl: `/daily-report/my-reports`
          }
        });
      } catch (notifErr) {
        console.error("[NOTIFICATION_ERROR]", notifErr);
      }
    }

    return NextResponse.json({ success: true, data: updatedReport });
  } catch (error: any) {
    console.error("[REPORT_APPROVE_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Internal server error occurred while reviewing report."
      },
      { status: 500 }
    );
  }
}
