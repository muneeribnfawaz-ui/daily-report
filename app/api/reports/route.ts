import { NextResponse } from "next/server";
import db from "@/lib/db";
import { dailyReportSchema } from "@/lib/validation";
import { getCurrentUser } from "@/lib/auth";
import { logAuditEntry } from "@/lib/audit";
import { isValidTeamTypeName } from "@/lib/team-types";
import { canEditDailyReport } from "@/lib/report-edit-access";
import { mapReportRelations, reportRelationsInclude } from "@/lib/report-mapper";
import { getVisibleReportEmployeeIds } from "@/lib/report-visibility";

function toDayRange(dateValue: string) {
  const day = new Date(dateValue);
  const nextDay = new Date(day);
  nextDay.setDate(nextDay.getDate() + 1);
  return { day, nextDay };
}

function getTodayValue() {
  return new Date().toISOString().slice(0, 10);
}

function getAllowedTeamNames(user: { teamName?: string | null; teamNames?: string[] | null; departments?: any[] }) {
  return Array.from(
    new Set([
      user.teamName,
      ...(user.teamNames ?? []),
      ...(user.departments?.map(d => typeof d === 'string' ? d : d.name) ?? [])
    ].filter((value): value is string => Boolean(value && value.trim())))
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


    const allowedTeamNames = getAllowedTeamNames(user);
    const resolvedTeamName = parsed.data.teamName?.trim() || allowedTeamNames[0] || "";
    const isAllowedDept = (user.departments || []).map((d: any) => typeof d === 'string' ? d : d.name).includes(resolvedTeamName);
    if (!resolvedTeamName || (!(await isValidTeamTypeName(resolvedTeamName)) && !isAllowedDept) || !allowedTeamNames.includes(resolvedTeamName)) {
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
    const existingReport = await db.dailyReport.findFirst({
      where: {
        workspaceId: parsed.data.workspaceId,
        employeeId: user.id,
        teamName: resolvedTeamName,
        reportDate: { gte: day, lt: nextDay }
      }
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
      status: "submitted",
      approvalItems: { create: (parsed.data.nextDayApprovalItems ?? []).map((i: any) => ({ particulars: i.particulars, amountINR: Number(i.amountINR) || 0, amountRiyal: Number(i.amountRiyal) || 0, reason: i.reason, review: i.review, approval: i.approval })) },
      workPlans: { create: (parsed.data.constructionWorkPlan ?? []).map((i: any) => ({ activity: i.activity, location: i.location, unit: i.unit, plannedQuantity: String(i.plannedQuantity), executedQuantity: String(i.executedQuantity), completionPercentage: String(i.completionPercentage), remarks: i.remarks })) },
      materialUtilizations: { create: (parsed.data.constructionMaterialUtilization ?? []).map((i: any) => ({ material: i.material, unit: i.unit, openingStock: String(i.openingStock), received: String(i.received), closingStock: String(i.closingStock) })) },
      tomorrowWorkPlans: { create: (parsed.data.constructionTomorrowWorkPlan ?? []).map((i: any) => ({ activity: i.activity, location: i.location, unit: i.unit, plannedQuantity: String(i.plannedQuantity) })) },
      marketingSelfItems: { create: (parsed.data.marketingSelfItems ?? []).map((i: any) => ({ date: i.date || (day instanceof Date ? day.toISOString().slice(0, 10) : String(day || new Date().toISOString().slice(0, 10))), executiveName: i.executiveName, clientName: i.clientName, companyName: i.companyName, clientType: i.clientType, mobileNo: i.mobileNo, location: i.location, referredBy: i.referredBy, discussionSummary: i.discussionSummary, interestLevel: i.interestLevel, followUpDate: i.followUpDate, status: i.status, remarks: i.remarks })) },
      marketingClientItems: { create: (parsed.data.marketingClientItems ?? []).map((i: any) => ({ date: i.date || (day instanceof Date ? day.toISOString().slice(0, 10) : String(day || new Date().toISOString().slice(0, 10))), executiveName: i.executiveName, clientName: i.clientName, companyName: i.companyName, clientType: i.clientType, contactPerson: i.contactPerson, mobileNo: i.mobileNo, email: i.email, projectType: i.projectType, requirementDiscussed: i.requirementDiscussed, projectStage: i.projectStage, decisionMaker: i.decisionMaker, interestLevel: i.interestLevel, nextAction: i.nextAction, followUpDate: i.followUpDate, status: i.status, remarks: i.remarks })) }
    };

    if (user.role === "team_lead" && existingReport) {
      return NextResponse.json(
        { success: false, message: "You’ve already submitted today’s report. Please use the Edit option to make changes." },
        { status: 409 }
      );
    }

    if (existingReport) {
      if (!canEditDailyReport(existingReport, user)) {
        return NextResponse.json(
          { success: false, message: "Team members need edit access approval before editing a report." },
          { status: 423 }
        );
      }

      const previous = existingReport;
      const updateData = { ...reportPayload };
      
      // For updates, we must delete existing nested items and recreate them
      (updateData as any).approvalItems = { deleteMany: {}, create: reportPayload.approvalItems.create };
      (updateData as any).workPlans = { deleteMany: {}, create: reportPayload.workPlans.create };
      (updateData as any).materialUtilizations = { deleteMany: {}, create: reportPayload.materialUtilizations.create };
      (updateData as any).tomorrowWorkPlans = { deleteMany: {}, create: reportPayload.tomorrowWorkPlans.create };
      (updateData as any).marketingSelfItems = { deleteMany: {}, create: reportPayload.marketingSelfItems.create };
      (updateData as any).marketingClientItems = { deleteMany: {}, create: reportPayload.marketingClientItems.create };

      (updateData as any).editAccessGranted = false;
      (updateData as any).editAccessGrantedBy = null;
      (updateData as any).editAccessGrantedAt = null;
      (updateData as any).editAccessRequested = false;
      (updateData as any).editAccessRequestReason = "";
      (updateData as any).editAccessRequestedAt = null;
      
      const updatedReport = await db.dailyReport.update({
        where: { id: existingReport.id },
        data: updateData,
        include: reportRelationsInclude
      });

      await logAuditEntry({
        action: "Report Updated",
        userId: user.id,
        userName: user.name,
        reportId: String(existingReport.id),
        oldValue: previous,
        newValue: reportPayload
      });

      const mappedReport = mapReportRelations({ ...updatedReport, _id: updatedReport.id });
      return NextResponse.json({ success: true, data: mappedReport, message: "Report updated successfully." });
    }

    const report = await db.dailyReport.create({ 
      data: reportPayload,
      include: reportRelationsInclude
    });

    await logAuditEntry({
      action: "Report Created",
      userId: user.id,
      userName: user.name,
      reportId: String(report.id),
      newValue: reportPayload
    });

    const mappedReport = mapReportRelations({ ...report, _id: report.id });
    return NextResponse.json({ success: true, data: mappedReport, message: "Report submitted successfully." }, { status: 201 });
  } catch (error) {
    console.error("Failed to create report", error);
    if (error instanceof Error && ((error as Error & { code?: string }).code === "E11000" || (error as Error & { code?: string }).code === "P2002")) {
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
  const team = url.searchParams.get("team") || url.searchParams.get("department") || request.headers.get("x-department");
  const employee = url.searchParams.get("employee") || url.searchParams.get("search");
  const status = url.searchParams.get("status");
  const locked = url.searchParams.get("locked");
  const date = url.searchParams.get("date");
  const mine = url.searchParams.get("mine") === "true";
  const workspaceId = url.searchParams.get("workspaceId") || request.headers.get("x-workspace-id") || user.workspaceId;

  const filter: Record<string, any> = {};

  if (user.role === "team_member" || mine) {
    filter.employeeId = user.id;
  } else {
    const visibleEmployeeIds = await getVisibleReportEmployeeIds(user, { workspaceId: workspaceId || undefined });
    if (visibleEmployeeIds && visibleEmployeeIds.length > 0) {
      filter.employeeId = { in: visibleEmployeeIds };
    } else {
      // If no employees are visible, ensure no reports are returned
      filter.employeeId = "non_existent_id";
    }
  }

  if (user.role === "ceo" && !mine) {
    const memberships = await db.workspaceMember.findMany({
      where: {
        userId: user.id,
        status: "active",
        isActive: true
      },
      include: { workspace: true }
    });
    const ceoWorkspaceIds = memberships.filter(m => m.workspace?.type === "ceo").map(m => m.workspaceId);
    const directCompanyWorkspaceIds = memberships.filter(m => m.workspace?.type !== "ceo").map(m => m.workspaceId);

    const ownedWorkspaces = await db.workspace.findMany({
      where: {
        ownerWorkspaceId: { in: ceoWorkspaceIds },
        isDeleted: false,
        isActive: true
      },
      select: { id: true }
    });
    const ownedWorkspaceIds = ownedWorkspaces.map(w => w.id);

    const allowedWorkspaceIds = Array.from(new Set([...directCompanyWorkspaceIds, ...ownedWorkspaceIds, ...ceoWorkspaceIds]));

    if (workspaceId && workspaceId !== "all") {
      filter.workspaceId = allowedWorkspaceIds.includes(workspaceId) ? workspaceId : "non_existent_id";
    } else {
      filter.workspaceId = { in: allowedWorkspaceIds };
    }
  } else if (user.role !== "admin" && !mine) {
    const memberships = await db.workspaceMember.findMany({ where: { userId: user.id, status: "active", isActive: true }, select: { workspaceId: true } });
    const allowedWorkspaceIds = memberships.map(m => String(m.workspaceId));

    if (workspaceId && workspaceId !== "all") {
      filter.workspaceId = allowedWorkspaceIds.includes(workspaceId) ? workspaceId : "non_existent_id";
    } else {
      filter.workspaceId = { in: allowedWorkspaceIds };
    }
  } else {
    if (workspaceId && workspaceId !== "all") {
      filter.workspaceId = workspaceId;
    }
  }

  if (team && team !== "All" && team !== "all") {
    const matchingTeamTypes = await db.teamType.findMany({
      where: {
        isDeleted: false,
        OR: [
          { name: team },
          { showName: team },
          { department: team },
          { name: { equals: team, mode: "insensitive" } },
          { showName: { equals: team, mode: "insensitive" } },
          { department: { equals: team, mode: "insensitive" } }
        ]
      },
      select: { name: true, showName: true }
    });

    const matchedNames = new Set<string>([team]);
    for (const tt of matchingTeamTypes) {
      if (tt.name) matchedNames.add(tt.name);
      if (tt.showName) matchedNames.add(tt.showName);
    }

    filter.teamName = { in: Array.from(matchedNames) };
  }

  if (status) filter.status = status;
  if (locked !== null && locked !== undefined && locked !== "") filter.isLocked = locked === "true";
  if (date) {
    const day = new Date(date);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    filter.reportDate = { gte: day, lt: nextDay };
  }

  if (employee && employee.trim() !== "") {
    const searchTrimmed = employee.trim();
    filter.OR = [
      { name: { contains: searchTrimmed, mode: "insensitive" } },
      { teamName: { contains: searchTrimmed, mode: "insensitive" } }
    ];
  }

  const reports = await db.dailyReport.findMany({ 
    where: filter, 
    orderBy: [{ reportDate: 'desc' }, { createdAt: 'desc' }],
    include: reportRelationsInclude
  });

  const employeeIds = Array.from(new Set(reports.map(r => String(r.employeeId)).filter(Boolean)));
  const members = employeeIds.length ? await db.workspaceMember.findMany({
    where: { userId: { in: employeeIds }, isActive: true },
    select: { userId: true, role: true }
  }) : [];
  const userRoleMap = new Map<string, string>();
  for (const m of members) {
    if (m.role) userRoleMap.set(String(m.userId), m.role);
  }

  const mappedReports = reports.map((report) => ({
    ...mapReportRelations(report),
    _id: report.id,
    employeeRole: userRoleMap.get(String(report.employeeId)) || "team_member"
  }));

  return NextResponse.json({ success: true, data: mappedReports });
}
