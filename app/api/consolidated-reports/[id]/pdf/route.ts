import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { buildReportPdfBuffer } from "@/lib/pdf";

type ConsolidatedReportPdfSource = {
  title: string;
  employeeCount: number;
  reportCount: number;
  teamNames?: string[] | null;
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "team_lead" && user.role !== "report_manager" && user.role !== "hod" && user.role !== "admin" && user.role !== "ceo")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const { id } = await Promise.resolve(params);
    const consolidated = (await db.consolidatedReport.findUnique({ where: { id } })) as ConsolidatedReportPdfSource | null;
  if (!consolidated) {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  }

  const reports = await db.dailyReport.findMany({ where: { consolidatedReportId: id } });
  const buffer = await buildReportPdfBuffer({
    title: consolidated.title,
    generatedBy: user.name,
    summary: {
      totalEmployees: consolidated.employeeCount,
      totalReports: consolidated.reportCount,
      teamSummary: Object.fromEntries((consolidated.teamNames || []).map((team) => [team, reports.filter((report) => report.teamName === team).length])),
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
      "Content-Disposition": `attachment; filename="${consolidated.title}.pdf"`
    }
  });
}
