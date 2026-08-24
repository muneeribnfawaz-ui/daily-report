import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { dailyReportSchema } from "@/lib/validation";
import { getCurrentUser } from "@/lib/auth";
import DailyReport from "@/models/DailyReport";
import WorkspaceMember from "@/models/WorkspaceMember";
import { logAuditEntry } from "@/lib/audit";
import { isValidTeamTypeName } from "@/lib/team-types";
import { ensureDailyReportIndexes } from "@/lib/daily-report-indexes";
import { canEditDailyReport } from "@/lib/report-edit-access";

function toDayRange(dateValue: string) {
  const day = new Date(dateValue);
  const nextDay = new Date(day);
  nextDay.setDate(nextDay.getDate() + 1);
  return { day, nextDay };
}

function getTodayValue() {
  return new Date().toISOString().slice(0, 10);
}

function getAllowedTeamNames(user: { teamName?: string | null; teamNames?: string[] | null }) {
  return Array.from(
    new Set([user.teamName, ...(user.teamNames ?? [])].filter((value): value is string => Boolean(value && value.trim())))
  );
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = dailyReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: "Invalid report payload" }, { status: 400 });
    }

    if (!parsed.data.workspaceId) {
      return NextResponse.json({ success: false, message: "Workspace context is required. Please refresh." }, { status: 400 });
    }

    await connectToDatabase();
    await ensureDailyReportIndexes();
    const allowedTeamNames = getAllowedTeamNames(user);
    const resolvedTeamName = parsed.data.teamName?.trim() || allowedTeamNames[0] || "";
    if (!resolvedTeamName || !(await isValidTeamTypeName(resolvedTeamName)) || !allowedTeamNames.includes(resolvedTeamName)) {
      return NextResponse.json({ success: false, message: "Unknown team type" }, { status: 400 });
    }

    const resolvedReportType =
      typeof parsed.data.reportType === "string" && parsed.data.reportType.length > 0
        ? parsed.data.reportType
        : "Daily Update";
    const resolvedReportDate =
      typeof parsed.data.reportDate === "string" && parsed.data.reportDate.length > 0
        ? parsed.data.reportDate
        : getTodayValue();
    const { day, nextDay } = toDayRange(resolvedReportDate);
    const existingReport = await DailyReport.findOne({
      employeeId: user.id,
      teamName: resolvedTeamName,
      reportDate: { $gte: day, $lt: nextDay }
    });

    const reportPayload = {
      workspaceId: parsed.data.workspaceId,
      employeeId: user.id,
      name: user.name,
      teamName: resolvedTeamName,
      reportType: resolvedReportType,
      reportDate: day,
      attachmentLink: parsed.data.attachmentLink ?? "",
      dailyMeetingUpdate: parsed.data.dailyMeetingUpdate ?? "",
      completedWork: parsed.data.completedWork,
      pendingWork: parsed.data.pendingWork ?? "",
      blockers: parsed.data.blockers ?? "",
      requiredClarification: parsed.data.requiredClarification ?? "",
      nextDayApprovalItems: parsed.data.nextDayApprovalItems ?? [],
      constructionWorkPlan: parsed.data.constructionWorkPlan ?? [],
      constructionMaterialUtilization: parsed.data.constructionMaterialUtilization ?? [],
      constructionTomorrowWorkPlan: parsed.data.constructionTomorrowWorkPlan ?? [],
      status: "submitted"
    } as const;

    if (existingReport) {
      if (!canEditDailyReport(existingReport, user)) {
        return NextResponse.json(
          { success: false, message: "Team members need edit access approval before editing a report." },
          { status: 423 }
        );
      }

      const previous = existingReport.toObject();
      Object.assign(existingReport, reportPayload);
      existingReport.editAccessGranted = false;
      existingReport.editAccessGrantedBy = null;
      existingReport.editAccessGrantedAt = null;
      existingReport.editAccessRequested = false;
      existingReport.editAccessRequestReason = "";
      existingReport.editAccessRequestedAt = null;
      await existingReport.save();

      await logAuditEntry({
        action: "Report Updated",
        userId: user.id,
        userName: user.name,
        reportId: String(existingReport._id),
        oldValue: previous,
        newValue: reportPayload
      });

      return NextResponse.json({ success: true, data: existingReport, message: "Report updated successfully." });
    }

    const report = await DailyReport.create(reportPayload);

    await logAuditEntry({
      action: "Report Created",
      userId: user.id,
      userName: user.name,
      reportId: String(report._id),
      newValue: reportPayload
    });

    return NextResponse.json({ success: true, data: report, message: "Report submitted successfully." }, { status: 201 });
  } catch (error) {
    console.error("Failed to create report", error);
    if (error instanceof Error && (error as Error & { code?: string }).code === "E11000") {
      return NextResponse.json(
        { success: false, message: "You already have a report for this day. Please update the existing report instead." },
        { status: 409 }
      );
    }
    if (error instanceof Error && error.name === "ValidationError") {
      return NextResponse.json(
        { success: false, message: error.message || "Invalid report payload" },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: false, message: "Failed to create report" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const team = url.searchParams.get("team");
  const status = url.searchParams.get("status");
  const locked = url.searchParams.get("locked");
  const date = url.searchParams.get("date");
  const workspaceId = url.searchParams.get("workspaceId") || request.headers.get("x-workspace-id") || user.workspaceId;

  await connectToDatabase();
  const filter: Record<string, any> = user.role === "team_member" ? { employeeId: user.id } : {};

  if (user.role !== "admin") {
    const memberships = await WorkspaceMember.find({
      userId: user.id,
      status: "active",
      isActive: true
    }).select("workspaceId").lean() as any[];
    const allowedWorkspaceIds = memberships.map(m => String(m.workspaceId));

    if (workspaceId && workspaceId !== "all") {
      filter.workspaceId = allowedWorkspaceIds.includes(workspaceId) ? workspaceId : "non_existent_id";
    } else {
      filter.workspaceId = { $in: allowedWorkspaceIds };
    }
  } else {
    if (workspaceId && workspaceId !== "all") {
      filter.workspaceId = workspaceId;
    }
  }

  if (team) filter.teamName = team;
  if (status) filter.status = status;
  if (locked !== null && locked !== undefined && locked !== "") filter.isLocked = locked === "true";
  if (date) {
    const day = new Date(date);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    filter.reportDate = { $gte: day, $lt: nextDay };
  }

  const reports = await DailyReport.find(filter).sort({ createdAt: -1 }).lean();

  return NextResponse.json({ success: true, data: reports });
}
