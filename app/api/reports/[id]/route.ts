import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import DailyReport from "@/models/DailyReport";
import { logAuditEntry } from "@/lib/audit";
import { ensureDailyReportIndexes } from "@/lib/daily-report-indexes";
import { canEditDailyReport } from "@/lib/report-edit-access";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const { id } = await Promise.resolve(params);
  await connectToDatabase();
  await ensureDailyReportIndexes();
  const report = (await DailyReport.findById(id).lean()) as
    | {
        employeeId: string;
        [key: string]: unknown;
      }
    | null;

  if (!report) {
    return NextResponse.json({ success: false, message: "Report not found" }, { status: 404 });
  }

  if ((user.role === "team_member" || user.role === "team_lead") && String(report.employeeId) !== user.id) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ success: true, data: { ...report, canEdit: canEditDailyReport(report, user) } });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const { id } = await Promise.resolve(params);
  await connectToDatabase();
  await ensureDailyReportIndexes();
  const report = await DailyReport.findById(id);

  if (!report) {
    return NextResponse.json({ success: false, message: "Report not found" }, { status: 404 });
  }

  if (user.role === "team_member" && String(report.employeeId) !== user.id) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  if ((user.role === "team_member" || user.role === "team_lead") && !canEditDailyReport(report, user)) {
    return NextResponse.json(
      { success: false, message: "Team members need edit access approval before editing a report." },
      { status: 423 }
    );
  }

  const payload = await request.json();
  const previous = report.toObject();
  const nextPayload = { ...payload };
  if (nextPayload.reportDate) {
    nextPayload.reportDate = new Date(nextPayload.reportDate);
  } else {
    delete nextPayload.reportDate;
  }
  if (nextPayload.reportType === "") {
    delete nextPayload.reportType;
  }
  if (nextPayload.teamName === "") {
    delete nextPayload.teamName;
  }
  if (typeof nextPayload.attachmentLink === "string") {
    nextPayload.attachmentLink = nextPayload.attachmentLink.trim();
    if (nextPayload.attachmentLink === "") {
      nextPayload.attachmentLink = "";
    }
  }
  Object.assign(report, nextPayload);
  report.editAccessGranted = false;
  report.editAccessGrantedBy = null;
  report.editAccessGrantedAt = null;
  report.editAccessRequested = false;
  report.editAccessRequestReason = "";
  report.editAccessRequestedAt = null;

  try {
    await report.save();
  } catch (error) {
    if (error instanceof Error && (error as Error & { code?: string }).code === "E11000") {
      return NextResponse.json(
        { success: false, message: "You already have a report for this day. Please update the existing report instead." },
        { status: 409 }
      );
    }
    throw error;
  }

  await logAuditEntry({
    action: "Report Updated",
    userId: user.id,
    userName: user.name,
    reportId: id,
    oldValue: previous,
    newValue: payload
  });

  return NextResponse.json({ success: true, data: report });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const { id } = await Promise.resolve(params);
  await connectToDatabase();
  await ensureDailyReportIndexes();
  const report = await DailyReport.findById(id);
  if (!report) {
    return NextResponse.json({ success: false, message: "Report not found" }, { status: 404 });
  }

  if (user.role === "team_member" && String(report.employeeId) !== user.id) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  if (report.isLocked) {
    return NextResponse.json({ success: false, message: "Locked reports cannot be deleted" }, { status: 423 });
  }

  await report.deleteOne();
  await logAuditEntry({
    action: "Report Deleted",
    userId: user.id,
    userName: user.name,
    reportId: id
  });

  return NextResponse.json({ success: true, data: { id } });
}
