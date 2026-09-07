import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logAuditEntry } from "@/lib/audit";
import { canApproveFinanceReport, canForwardFinanceReport } from "@/lib/permissions";
import { encryptPayload, decryptPayload } from "@/lib/crypto";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  // Determine if user has senior privileges to approve edits (TL/HOD/Admin/CEO)
  const isSenior = canApproveFinanceReport(user) || canForwardFinanceReport(user) || user.role === "team_lead";
  if (!isSenior) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const rawBody = await request.json().catch(() => ({}));
  let body = rawBody;
  if (rawBody.encryptedData) {
    try {
      body = await decryptPayload(rawBody.encryptedData);
    } catch (err) {
      return NextResponse.json({ success: false, message: "Failed to decrypt payload" }, { status: 400 });
    }
  }

  const report = await db.financeReport.findUnique({ where: { id: String(id) } });
  if (!report) {
    return NextResponse.json({ success: false, message: "Finance Report not found" }, { status: 404 });
  }

  if (!report.editAccessRequested) {
    return NextResponse.json({ success: false, message: "No edit request pending for this report." }, { status: 400 });
  }

  const approve = body.approve === true;

  if (approve) {
    const updatedReport = await db.financeReport.update({
      where: { id: report.id },
      data: {
        editAccessRequested: false,
        editAccessGranted: true,
        editAccessGrantedBy: user.id
      }
    });

    await logAuditEntry({
      action: "Finance Report Edit Approved",
      userId: user.id,
      userName: user.name,
      reportId: id,
      newValue: { editAccessGranted: true }
    });

    const encryptedData = await encryptPayload(updatedReport);
    return NextResponse.json({ success: true, encryptedData, data: updatedReport, message: "Edit access has been granted." });
  } else {
    const updatedReport = await db.financeReport.update({
      where: { id: report.id },
      data: {
        editAccessRequested: false,
        editAccessRequestReason: "" // Clear reason upon rejection
      }
    });

    await logAuditEntry({
      action: "Finance Report Edit Rejected",
      userId: user.id,
      userName: user.name,
      reportId: id,
      newValue: { editAccessRequested: false }
    });

    const encryptedData = await encryptPayload(updatedReport);
    return NextResponse.json({ success: true, encryptedData, data: updatedReport, message: "Edit request has been rejected." });
  }
}
