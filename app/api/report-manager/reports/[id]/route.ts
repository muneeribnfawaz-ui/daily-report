import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logAuditEntry } from "@/lib/audit";
import { getActiveLeaveRequestsForRange } from "@/lib/leave-requests";
import { getVisibleReportEmployeeIds } from "@/lib/report-visibility";
import { canEditDailyReport } from "@/lib/report-edit-access";
import { mapReportRelations, reportRelationsInclude } from "@/lib/report-mapper";

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
    const report = (await db.dailyReport.findUnique({ 
      where: { id: String(id) },
      include: reportRelationsInclude
    })) as
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
  const employee = await db.user.findUnique({ where: { id: String(report.employeeId) } });
  const activeLeave = leaveRequests[0] ?? null;
  
  const mappedReport = mapReportRelations({
    ...report,
    canEdit: canEditDailyReport(report, { role: employee?.role }),
    employeeRole: employee?.role ?? null,
    leaveStatus: activeLeave?.status ?? null,
    leaveType: activeLeave?.leaveType,
    leaveReason: activeLeave?.reason,
    leaveReviewedByName: activeLeave?.reviewedByName
  });

  return NextResponse.json({
    success: true,
    data: {
      ...mappedReport,
      _id: report.id,
    }
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await assertManager();
  if (!user) return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

  const { id } = await Promise.resolve(params);
  const body = await request.json();
    const report = await db.dailyReport.findUnique({ where: { id: String(id) } });
  if (!report) return NextResponse.json({ success: false, message: "Report not found" }, { status: 404 });

  const visibleEmployeeIds = await getVisibleReportEmployeeIds(user);
  if (visibleEmployeeIds && !visibleEmployeeIds.includes(String(report.employeeId))) {
    return NextResponse.json({ success: false, message: "Report not found" }, { status: 404 });
  }

  const previous = report;
  
  // Exclude id and other fields that shouldn't be updated directly via object spread if necessary,
  // but Prisma update handles this safely if we just pass body to data (excluding id)
  const updateData = { ...body };
  delete updateData.id;
  
  const updatedReport = await db.dailyReport.update({
    where: { id: report.id },
    data: updateData
  });

  await logAuditEntry({
    action: body.status === "approved" ? "Report Approved" : "Report Rejected",
    userId: user.id,
    userName: user.name,
    reportId: id,
    oldValue: previous,
    newValue: body
  });

  return NextResponse.json({ success: true, data: { ...updatedReport, _id: updatedReport.id } });
}
