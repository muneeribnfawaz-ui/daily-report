import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logAuditEntry } from "@/lib/audit";


export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "team_lead" && user.role !== "report_manager" && user.role !== "hod" && user.role !== "admin" && user.role !== "ceo")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const { id } = await Promise.resolve(params);
    const report = await db.dailyReport.findUnique({ where: { id: String(id) } });

  if (!report) {
    return NextResponse.json({ success: false, message: "Report not found" }, { status: 404 });
  }

  if (String(report.employeeId) === user.id) {
    return NextResponse.json({ success: false, message: "You cannot review or verify your own report." }, { status: 400 });
  }

  const authorMember = await db.workspaceMember.findFirst({ where: { userId: report.employeeId, status: "active", isActive: true } }) as any;
  const authorRole = authorMember?.role || "team_member";

  if (user.role === "team_lead" || user.role === "report_manager") {
    if (report.verificationLevel) {
      return NextResponse.json({ success: false, message: "This report has already been verified." }, { status: 400 });
    }
  }

  if (user.role === "hod") {
    if (authorRole !== "team_lead") {
      if (report.verificationLevel === "tl" || report.verificationLevel === "hod" || report.verificationLevel === "ceo") {
        return NextResponse.json(
          { success: false, message: "This Team Member report was already verified by Team Lead. Re-verification by HOD is not required." },
          { status: 400 }
        );
      }
    } else {
      if (report.verificationLevel === "hod" || report.verificationLevel === "ceo") {
        return NextResponse.json(
          { success: false, message: "This Team Lead report has already been verified by HOD." },
          { status: 400 }
        );
      }
    }
  }

  const body = await request.json().catch(() => ({}));
  const action = body.action === "reject" ? "reject" : "approve";
  const reviewNotes = typeof body.reviewNotes === "string" ? body.reviewNotes.trim() : "";
  const rejectionReason = typeof body.rejectionReason === "string" ? body.rejectionReason.trim() : "";

  if (action === "reject" && !rejectionReason && !reviewNotes) {
    return NextResponse.json({ success: false, message: "Please provide a rejection reason or review notes." }, { status: 400 });
  }

  const previousState = report;

  const updatedReport = await db.dailyReport.update({
    where: { id: report.id },
    data: {
      status: action === "approve" ? "approved" : "rejected",
      approvedBy: action === "approve" ? user.id : undefined,
      approvedAt: action === "approve" ? new Date() : undefined,
      rejectionReason: action === "approve" ? "" : (rejectionReason || reviewNotes),
      reviewNotes,
      reviewedBy: user.id,
      reviewedByName: user.name,
      reviewedAt: new Date(),
      verificationLevel: user.role
    }
  });

  // Create audit log
  await logAuditEntry({
    action: action === "approve" ? "Report Approved/Verified" : "Report Rejected",
    userId: user.id,
    userName: user.name,
    reportId: id,
    oldValue: previousState,
    newValue: updatedReport
  });

  if (String(report.employeeId) !== user.id) {
    await db.notification.create({
      data: {
        recipientId: report.employeeId,
        type: action === "approve" ? "report_verified" : "report_rejected",
        title: action === "approve" ? "Daily Report Verified" : "Daily Report Rejected",
        message: action === "approve"
          ? `Your report for ${new Date(report.reportDate).toLocaleDateString()} was verified by ${user.name} (${user.role.toUpperCase()}).${reviewNotes ? ` Notes: "${reviewNotes}"` : ""}`
          : `Your report for ${new Date(report.reportDate).toLocaleDateString()} was rejected by ${user.name}. Reason: "${rejectionReason || reviewNotes}"`,
        linkUrl: `/daily-report/my-reports`
      }
    });
  }

  return NextResponse.json({ success: true, data: updatedReport });
}
