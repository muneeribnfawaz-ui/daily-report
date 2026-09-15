import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logAuditEntry } from "@/lib/audit";
import { canEditDailyReport } from "@/lib/report-edit-access";
import { mapReportRelations, reportRelationsInclude } from "@/lib/report-mapper";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const { id } = await Promise.resolve(params);

  const report = (await db.dailyReport.findUnique({ 
    where: { id: String(id) },
    include: reportRelationsInclude
  })) as
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

  const employee = await db.user.findUnique({ where: { id: String(report.employeeId) } });
  const member = await db.workspaceMember.findFirst({
    where: { userId: String(report.employeeId), workspaceId: report.workspaceId as string, isActive: true }
  });
  const effectiveRole = member?.role || employee?.role || "team_member";

  let teamLeadReviews: any[] = [];
  if (effectiveRole === "report_manager" || effectiveRole === "admin" || effectiveRole === "ceo" || effectiveRole === "hod") {
    const dateStr = typeof report.reportDate === "string" 
      ? (report.reportDate as string).slice(0, 10) 
      : new Date(report.reportDate as Date).toISOString().slice(0, 10);
    const dayStart = new Date(dateStr);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const tlReports = await db.dailyReport.findMany({
      where: {
        workspaceId: report.workspaceId as string,
        reportDate: { gte: dayStart, lt: dayEnd },
        OR: [
          { reportManagerReviewedBy: String(report.employeeId) },
          { reportManagerReviewedByName: employee?.name || (report.name as string) }
        ]
      },
      select: {
        id: true,
        name: true,
        teamName: true,
        reportType: true,
        reportDate: true,
        status: true,
        reportManagerStatus: true,
        reportManagerReview: true,
        reportManagerReviewedByName: true,
        reportManagerReviewedAt: true
      },
      orderBy: { createdAt: "asc" }
    });

    teamLeadReviews = tlReports.filter((r) => Boolean(r.reportManagerStatus || r.reportManagerReview));
  }

  return NextResponse.json({
    success: true,
    data: mapReportRelations({
      ...report,
      _id: report.id,
      employeeRole: effectiveRole,
      teamLeadReviews,
      canEdit: canEditDailyReport(report, { ...user, role: effectiveRole })
    })
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const { id } = await Promise.resolve(params);

  const report = await db.dailyReport.findUnique({ where: { id: String(id) } });

  if (!report) {
    return NextResponse.json({ success: false, message: "Report not found" }, { status: 404 });
  }

  if (user.role !== "admin" && user.role !== "ceo" && String(report.employeeId) !== user.id) {
    return NextResponse.json({ success: false, message: "Forbidden: You can only update your own report." }, { status: 403 });
  }

  if (user.role !== "admin" && !canEditDailyReport(report, user)) {
    return NextResponse.json(
      { success: false, message: "You do not have permission to edit this report or the edit window has expired." },
      { status: 423 }
    );
  }

  const payload = await request.json();
  const previous = report;
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
  const updateData: any = { ...nextPayload };
  
  if (updateData.nextDayApprovalItems) {
    updateData.approvalItems = { deleteMany: {}, create: updateData.nextDayApprovalItems.map((i: any) => ({ particulars: i.particulars, amountINR: Number(i.amountINR) || 0, amountRiyal: Number(i.amountRiyal) || 0, reason: i.reason, review: i.review, approval: i.approval })) };
    delete updateData.nextDayApprovalItems;
  }
  if (updateData.constructionWorkPlan) {
    updateData.workPlans = { deleteMany: {}, create: updateData.constructionWorkPlan.map((i: any) => ({ activity: i.activity, location: i.location, unit: i.unit, plannedQuantity: String(i.plannedQuantity), executedQuantity: String(i.executedQuantity), completionPercentage: String(i.completionPercentage), remarks: i.remarks })) };
    delete updateData.constructionWorkPlan;
  }
  if (updateData.constructionMaterialUtilization) {
    updateData.materialUtilizations = { deleteMany: {}, create: updateData.constructionMaterialUtilization.map((i: any) => ({ material: i.material, unit: i.unit, openingStock: String(i.openingStock), received: String(i.received), closingStock: String(i.closingStock) })) };
    delete updateData.constructionMaterialUtilization;
  }
  if (updateData.constructionTomorrowWorkPlan) {
    updateData.tomorrowWorkPlans = { deleteMany: {}, create: updateData.constructionTomorrowWorkPlan.map((i: any) => ({ activity: i.activity, location: i.location, unit: i.unit, plannedQuantity: String(i.plannedQuantity) })) };
    delete updateData.constructionTomorrowWorkPlan;
  }
  if (updateData.marketingSelfItems) {
    updateData.marketingSelfItems = { deleteMany: {}, create: updateData.marketingSelfItems.map((i: any) => ({ date: i.date || (updateData.reportDate instanceof Date ? updateData.reportDate.toISOString().slice(0, 10) : String(updateData.reportDate || new Date().toISOString().slice(0, 10))), executiveName: i.executiveName, clientName: i.clientName, companyName: i.companyName, clientType: i.clientType, mobileNo: i.mobileNo, location: i.location, referredBy: i.referredBy, discussionSummary: i.discussionSummary, interestLevel: i.interestLevel, followUpDate: i.followUpDate, status: i.status, remarks: i.remarks })) };
  }
  if (updateData.marketingClientItems) {
    updateData.marketingClientItems = { deleteMany: {}, create: updateData.marketingClientItems.map((i: any) => ({ date: i.date || (updateData.reportDate instanceof Date ? updateData.reportDate.toISOString().slice(0, 10) : String(updateData.reportDate || new Date().toISOString().slice(0, 10))), executiveName: i.executiveName, clientName: i.clientName, companyName: i.companyName, clientType: i.clientType, contactPerson: i.contactPerson, mobileNo: i.mobileNo, email: i.email, projectType: i.projectType, requirementDiscussed: i.requirementDiscussed, projectStage: i.projectStage, decisionMaker: i.decisionMaker, interestLevel: i.interestLevel, nextAction: i.nextAction, followUpDate: i.followUpDate, status: i.status, remarks: i.remarks })) };
  }

  updateData.editAccessGranted = false;
  updateData.editAccessGrantedBy = null;
  updateData.editAccessGrantedAt = null;
  updateData.editAccessRequested = false;
  updateData.editAccessRequestReason = "";
  updateData.editAccessRequestedAt = null;

  let updatedReport;
  try {
    updatedReport = await db.dailyReport.update({
      where: { id: report.id },
      data: updateData,
      include: reportRelationsInclude
    });
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

  const mappedReport = mapReportRelations({ ...updatedReport, _id: updatedReport.id });

  return NextResponse.json({ success: true, data: mappedReport });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const { id } = await Promise.resolve(params);

  const report = await db.dailyReport.findUnique({ where: { id: String(id) } });
  if (!report) {
    return NextResponse.json({ success: false, message: "Report not found" }, { status: 404 });
  }

  if (user.role === "team_member" && String(report.employeeId) !== user.id) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  if (report.isLocked) {
    return NextResponse.json({ success: false, message: "Locked reports cannot be deleted" }, { status: 423 });
  }

  await db.dailyReport.delete({ where: { id: report.id } });
  await logAuditEntry({
    action: "Report Deleted",
    userId: user.id,
    userName: user.name,
    reportId: id
  });

  return NextResponse.json({ success: true, data: { id } });
}
