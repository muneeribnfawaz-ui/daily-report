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

  return NextResponse.json({ success: true, data: mapReportRelations({ ...report, canEdit: canEditDailyReport(report, user) }) });
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

  if ((user.role === "team_member" || user.role === "team_lead") && !canEditDailyReport(report, user)) {
    return NextResponse.json(
      { success: false, message: "Team members need edit access approval before editing a report." },
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
