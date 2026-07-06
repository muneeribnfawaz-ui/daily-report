import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getConsolidatedReportDetail } from "@/lib/consolidated-report-data";
import { buildConsolidatedReportHtml } from "@/lib/consolidated-report-pdf";
import { renderPdfFromHtml } from "@/lib/browser-pdf";
import type { SessionUser } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  return {
    name: "UnknownError",
    message: String(error)
  };
}

export async function GET(request: Request) {
  let user: SessionUser | null;
  try {
    user = await getCurrentUser();
    if (!user || (user.role !== "team_lead" && user.role !== "report_manager" && user.role !== "hod" && user.role !== "admin" && user.role !== "ceo")) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }
  } catch (error) {
    console.error("Failed to read current user for consolidated report PDF", { error });
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ success: false, message: "date is required" }, { status: 400 });
  }

  const groupParam = url.searchParams.get("group");
  const reportGroup: "finance" | "operations" | "all" =
    groupParam === "finance" ? "finance" : groupParam === "all" ? "all" : "operations";

  // Finance consolidated reports are restricted to admin, ceo, and hod only.
  if (reportGroup === "finance" && user.role !== "admin" && user.role !== "ceo" && user.role !== "hod") {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const isFinance = reportGroup === "finance";
  const reportTitle = isFinance
    ? `Finance Consolidated Report - ${date}`
    : `Operations Consolidated Report - ${date}`;
  const downloadFilename = isFinance
    ? `finance-consolidated-${date}.pdf`
    : `operations-consolidated-${date}.pdf`;

  let stage = "loading report data";
  try {
    const data = await getConsolidatedReportDetail(date, user.name, user.role, user.teamName, reportGroup);
    stage = "building report HTML";
    const html = buildConsolidatedReportHtml({
      date: data.date,
      reportCount: data.reportCount,
      teamCount: data.teamCount,
      teamGroups: data.teamGroups,
      title: reportTitle,
      generatedBy: user.name,
      subtitle: `${data.reportCount} reports · ${data.teamCount} teams`
    });

    stage = "rendering PDF";
    const buffer = await renderPdfFromHtml(html);

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${downloadFilename}"`
      }
    });
  } catch (error) {
    const serializedError = serializeError(error);
    console.error("Failed to generate consolidated report PDF", {
      date,
      stage,
      userId: user.id,
      error: serializedError
    });

    return NextResponse.json(
      { success: false, message: "Failed to generate consolidated report PDF" },
      { status: 500 }
    );
  }
}
