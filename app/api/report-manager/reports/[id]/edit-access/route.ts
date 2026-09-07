import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logAuditEntry } from "@/lib/audit";
import { getVisibleReportEmployeeIds } from "@/lib/report-visibility";

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "team_lead" && user.role !== "report_manager" && user.role !== "hod" && user.role !== "admin" && user.role !== "ceo")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

    const report = await db.dailyReport.findUnique({ where: { id: String(id) } });
  if (!report) {
    return NextResponse.json({ success: false, message: "Report not found" }, { status: 404 });
  }

  const visibleEmployeeIds = await getVisibleReportEmployeeIds(user);
  if (visibleEmployeeIds && !visibleEmployeeIds.includes(String(report.employeeId))) {
    return NextResponse.json({ success: false, message: "Report not found" }, { status: 404 });
  }

  if (report.isLocked) {
    return NextResponse.json({ success: false, message: "Locked reports cannot be edited." }, { status: 423 });
  }

  const updatedReport = await db.dailyReport.update({
    where: { id: report.id },
    data: {
      editAccessGranted: true,
      editAccessGrantedBy: user.id,
      editAccessGrantedAt: new Date(),
      editAccessRequested: false
    }
  });

  await logAuditEntry({
    action: "Report Edit Access Granted",
    userId: user.id,
    userName: user.name,
    reportId: id,
    newValue: {
      editAccessGranted: true
    }
  });

  return NextResponse.json({ success: true, data: updatedReport, message: "Edit access enabled for this report." });
}
