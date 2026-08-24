import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import DailyReport from "@/models/DailyReport";
import User from "@/models/User";
import { logAuditEntry } from "@/lib/audit";
import { getActiveLeaveRequestsForRange } from "@/lib/leave-requests";
import { getVisibleReportEmployeeIds } from "@/lib/report-visibility";
import { canEditDailyReport } from "@/lib/report-edit-access";

async function assertManager() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "team_lead" && user.role !== "report_manager" && user.role !== "hod" && user.role !== "admin" && user.role !== "ceo")) {
    return null;
  }
  return user;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await assertManager();
  if (!user) return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

  const { id } = await Promise.resolve(params);
  await connectToDatabase();
  const report = (await DailyReport.findById(id).lean()) as
    | {
        employeeId: string;
        reportDate: string | Date;
      [key: string]: unknown;
    }
    | null;
  if (!report) return NextResponse.json({ success: false, message: "Report not found" }, { status: 404 });

  const visibleEmployeeIds = await getVisibleReportEmployeeIds(user);
  if (visibleEmployeeIds && !visibleEmployeeIds.includes(String(report.employeeId))) {
    return NextResponse.json({ success: false, message: "Report not found" }, { status: 404 });
  }

  const leaveRequests = await getActiveLeaveRequestsForRange({
    employeeIds: [String(report.employeeId)],
    dateFrom: new Date(report.reportDate).toISOString().slice(0, 10)
  });
  const employee = await User.findById(report.employeeId).lean<{ role?: string | null } | null>();
  const activeLeave = leaveRequests[0] ?? null;
  return NextResponse.json({
    success: true,
    data: {
      ...report,
      canEdit: canEditDailyReport(report, { role: employee?.role }),
      employeeRole: employee?.role ?? null,
      leaveStatus: activeLeave?.status ?? null,
      leaveType: activeLeave?.leaveType,
      leaveReason: activeLeave?.reason,
      leaveReviewedByName: activeLeave?.reviewedByName
    }
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await assertManager();
  if (!user) return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

  const { id } = await Promise.resolve(params);
  const body = await request.json();
  await connectToDatabase();
  const report = await DailyReport.findById(id);
  if (!report) return NextResponse.json({ success: false, message: "Report not found" }, { status: 404 });

  const visibleEmployeeIds = await getVisibleReportEmployeeIds(user);
  if (visibleEmployeeIds && !visibleEmployeeIds.includes(String(report.employeeId))) {
    return NextResponse.json({ success: false, message: "Report not found" }, { status: 404 });
  }

  const previous = report.toObject();
  Object.assign(report, body);
  await report.save();

  await logAuditEntry({
    action: body.status === "approved" ? "Report Approved" : "Report Rejected",
    userId: user.id,
    userName: user.name,
    reportId: id,
    oldValue: previous,
    newValue: body
  });

  return NextResponse.json({ success: true, data: report });
}
