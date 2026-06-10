import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import DailyReport from "@/models/DailyReport";
import { logAuditEntry } from "@/lib/audit";
import { getVisibleReportEmployeeIds } from "@/lib/report-visibility";

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "team_lead" && user.role !== "report_manager" && user.role !== "hod" && user.role !== "admin")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  await connectToDatabase();
  const report = await DailyReport.findById(id);
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

  report.editAccessGranted = true;
  report.editAccessGrantedBy = user.id;
  report.editAccessGrantedAt = new Date();
  report.editAccessRequested = false;
  await report.save();

  await logAuditEntry({
    action: "Report Edit Access Granted",
    userId: user.id,
    userName: user.name,
    reportId: id,
    newValue: {
      editAccessGranted: true
    }
  });

  return NextResponse.json({ success: true, data: report, message: "Edit access enabled for this report." });
}
