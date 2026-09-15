import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logAuditEntry } from "@/lib/audit";
import { canEditDailyReport, isReportDateToday } from "@/lib/report-edit-access";
import { notifyReportEditAccessRequested } from "@/lib/notifications";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const report = await db.dailyReport.findUnique({ where: { id: String(id) } });
  if (!report) {
    return NextResponse.json({ success: false, message: "Report not found" }, { status: 404 });
  }

  if (String(report.employeeId) !== user.id) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  if (!isReportDateToday(report.reportDate)) {
    return NextResponse.json({ success: false, message: "Edit requests can only be made on the same day the report was created." }, { status: 403 });
  }

  if (report.isLocked) {
    return NextResponse.json({ success: false, message: "Locked reports cannot be edited." }, { status: 423 });
  }

  if (report.editAccessGranted) {
    return NextResponse.json({ success: false, message: "Edit access has already been granted." }, { status: 409 });
  }

  if (report.editAccessRequested) {
    return NextResponse.json({ success: false, message: "An edit request is already pending." }, { status: 409 });
  }

  if (canEditDailyReport(report, user)) {
    return NextResponse.json({ success: true, data: report, message: "Edit access is already available." });
  }

  const updatedReport = await db.dailyReport.update({
    where: { id: report.id },
    data: {
      editAccessRequested: true,
      editAccessRequestReason: typeof body.reason === "string" ? body.reason.trim() : "",
      editAccessRequestedAt: new Date()
    }
  });

  await logAuditEntry({
    action: "Report Edit Requested",
    userId: user.id,
    userName: user.name,
    reportId: id,
    newValue: {
      editAccessRequested: true,
      editAccessRequestReason: updatedReport.editAccessRequestReason
    }
  });

  // Identify approvers and notify them via centralized helper
  await notifyReportEditAccessRequested({
    report: {
      id: report.id,
      name: report.name,
      employeeId: report.employeeId,
      reportDate: report.reportDate,
      teamName: report.teamName,
      workspaceId: report.workspaceId
    },
    requester: {
      id: user.id,
      name: user.name,
      role: user.role
    },
    reason: updatedReport.editAccessRequestReason
  });

  const successMessage =
    user.role === "team_member"
      ? "Edit request sent to your team lead."
      : user.role === "team_lead"
        ? "Edit request sent to your manager."
        : "Edit request submitted for approval.";

  return NextResponse.json({ success: true, data: updatedReport, message: successMessage });
}
