import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import DailyReport from "@/models/DailyReport";
import { buildReportPdfBuffer } from "@/lib/pdf";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "team_lead" && user.role !== "report_manager" && user.role !== "hod" && user.role !== "admin")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const employeeId = url.searchParams.get("employeeId");

  await connectToDatabase();
  const reports = employeeId ? await DailyReport.find({ employeeId }).lean() : await DailyReport.find().lean();

  const buffer = await buildReportPdfBuffer({
    title: "Daily Reports",
    generatedBy: user.name,
    summary: {
      totalEmployees: new Set(reports.map((report) => String(report.employeeId))).size,
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
    reports: reports.map((report) => ({
      name: report.name,
      teamName: report.teamName,
      reportType: report.reportType,
      attachmentLink: report.attachmentLink,
      dailyMeetingUpdate: report.dailyMeetingUpdate,
      completedWork: report.completedWork,
      pendingWork: report.pendingWork,
      blockers: report.blockers,
      requiredClarification: report.requiredClarification,
      status: report.status
    })),
    missingReports: []
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="daily-reports.pdf"`
    }
  });
}
