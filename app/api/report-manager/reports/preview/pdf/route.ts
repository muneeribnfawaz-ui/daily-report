import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { buildReportPdfBuffer } from "@/lib/pdf";
import { getConsolidatedReportDetail } from "@/lib/consolidated-report-data";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "team_lead" && user.role !== "report_manager" && user.role !== "hod" && user.role !== "admin")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ success: false, message: "date is required" }, { status: 400 });
  }

  const data = await getConsolidatedReportDetail(date, user.name, user.role, user.teamName);
  const reports = data.teamGroups.flatMap((team) =>
    team.reports.map((report) => ({
      employeeId: report.employeeId,
      name: report.name,
      teamName: report.teamName,
      reportType: report.reportType,
      attachmentLink: report.attachmentLink,
      dailyMeetingUpdate: report.dailyMeetingUpdate ?? "",
      completedWork: report.completedWork,
      pendingWork: report.pendingWork,
      blockers: report.blockers,
      requiredClarification: report.requiredClarification,
      status: "submitted",
      leaveStatus: report.leaveStatus ?? null,
      leaveType: report.leaveType,
      leaveReason: report.leaveReason,
      leaveReviewedByName: report.leaveReviewedByName ?? null
    }))
  );
  const reportEmployeeIds = new Set(reports.map((report) => report.employeeId).filter(Boolean));
  const missingReports = data.teamGroups.flatMap((team) =>
    (team.leaveMembers ?? [])
      .filter((member) => !reportEmployeeIds.has(member.employeeId))
      .map(
        (member) =>
          `${member.name} - ${member.status === "approved" ? "On Leave" : "Leave Requested"}${member.leaveDuration ? ` (${member.leaveDuration === "full_day" ? "Full Day" : "Half Day"}${member.leaveDuration === "half_day" && member.leaveHalf ? ` · ${member.leaveHalf === "first_half" ? "First Half" : "Second Half"}` : ""})` : ""}`
      )
  );

  const buffer = await buildReportPdfBuffer({
    title: `Report Preview - ${date}`,
    generatedBy: user.name,
    summary: {
      totalEmployees: new Set(reports.map((report) => report.employeeId)).size,
      totalReports: reports.length,
      teamSummary: reports.reduce<Record<string, number>>((acc, report) => {
        acc[report.teamName] = (acc[report.teamName] ?? 0) + 1;
        return acc;
      }, {}),
      statusSummary: reports.reduce<Record<string, number>>((acc, report) => {
        acc[report.status] = (acc[report.status] ?? 0) + 1;
        return acc;
      }, {})
    },
    reports,
    missingReports
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="report-preview-${date}.pdf"`
    }
  });
}
