import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logAuditEntry } from "@/lib/audit";
import { getVisibleReportEmployeeIds } from "@/lib/report-visibility";
import { notifyReportEditAccessApproved, notifyReportEditAccessRejected } from "@/lib/notifications";

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

  if (!report.editAccessRequested) {
    return NextResponse.json({ success: false, message: "No edit request pending for this report." }, { status: 400 });
  }

  const visibleEmployeeIds = await getVisibleReportEmployeeIds(user as any);
  if (!visibleEmployeeIds.includes(String(report.employeeId))) {
    return NextResponse.json({ success: false, message: "You are not authorized to approve this request." }, { status: 403 });
  }

  const employee = await db.user.findUnique({ where: { id: String(report.employeeId) }, select: { role: true } });
  if (employee) {
    if (employee.role === "team_member" && user.role !== "team_lead" && user.role !== "admin" && user.role !== "ceo") {
      return NextResponse.json({ success: false, message: "Only the assigned Team Lead can approve Team Member requests." }, { status: 403 });
    }
    if (employee.role === "team_lead" && user.role !== "report_manager" && user.role !== "hod" && user.role !== "admin" && user.role !== "ceo") {
      return NextResponse.json({ success: false, message: "Only the assigned Report Manager or HOD can approve Team Lead requests." }, { status: 403 });
    }
    if (employee.role === "report_manager" && user.role !== "hod" && user.role !== "admin" && user.role !== "ceo") {
      return NextResponse.json({ success: false, message: "Only the assigned HOD can approve Report Manager requests." }, { status: 403 });
    }
    if (employee.role === "hod") {
      return NextResponse.json({ success: false, message: "HOD reports do not require approval." }, { status: 400 });
    }
  }

  const approve = body.approve === true;

  if (approve) {
    const updatedReport = await db.dailyReport.update({
      where: { id: report.id },
      data: {
        editAccessRequested: false,
        editAccessGranted: true,
        editAccessGrantedBy: user.id
      }
    });

    await logAuditEntry({
      action: "Report Edit Approved",
      userId: user.id,
      userName: user.name,
      reportId: id,
      newValue: { editAccessGranted: true }
    });

    await notifyReportEditAccessApproved({
      report: {
        id: report.id,
        employeeId: report.employeeId,
        reportDate: report.reportDate,
        workspaceId: report.workspaceId
      },
      approver: {
        id: user.id,
        name: user.name
      }
    });

    return NextResponse.json({ success: true, data: updatedReport, message: "Edit access has been granted." });
  } else {
    const updatedReport = await db.dailyReport.update({
      where: { id: report.id },
      data: {
        editAccessRequested: false,
        editAccessRequestReason: "" // Clear reason upon rejection
      }
    });

    await logAuditEntry({
      action: "Report Edit Rejected",
      userId: user.id,
      userName: user.name,
      reportId: id,
      newValue: { editAccessRequested: false }
    });

    await notifyReportEditAccessRejected({
      report: {
        id: report.id,
        employeeId: report.employeeId,
        reportDate: report.reportDate,
        workspaceId: report.workspaceId
      },
      rejecter: {
        id: user.id,
        name: user.name
      }
    });

    return NextResponse.json({ success: true, data: updatedReport, message: "Edit request has been rejected." });
  }
}
