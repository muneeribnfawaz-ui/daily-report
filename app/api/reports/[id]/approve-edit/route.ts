import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logAuditEntry } from "@/lib/audit";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const report = await db.dailyReport.findUnique({ where: { id: String(id) } });
  if (!report) {
    return NextResponse.json({ success: false, message: "Report not found" }, { status: 404 });
  }

  if (!report.editAccessRequested) {
    return NextResponse.json({ success: false, message: "No edit request pending for this report." }, { status: 400 });
  }

  const approve = body.approve === true;

  if (approve) {
    const updatedReport = await db.dailyReport.update({
      where: { id: report.id },
      data: {
        editAccessRequested: false,
        editAccessGranted: true,
        editAccessGrantedBy: user.id
      }
    });

    await logAuditEntry({
      action: "Report Edit Approved",
      userId: user.id,
      userName: user.name,
      reportId: id,
      newValue: { editAccessGranted: true }
    });

    return NextResponse.json({ success: true, data: updatedReport, message: "Edit access has been granted." });
  } else {
    const updatedReport = await db.dailyReport.update({
      where: { id: report.id },
      data: {
        editAccessRequested: false,
        editAccessRequestReason: "" // Clear reason upon rejection
      }
    });

    await logAuditEntry({
      action: "Report Edit Rejected",
      userId: user.id,
      userName: user.name,
      reportId: id,
      newValue: { editAccessRequested: false }
    });

    return NextResponse.json({ success: true, data: updatedReport, message: "Edit request has been rejected." });
  }
}
