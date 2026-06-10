import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import DailyReport from "@/models/DailyReport";
import { logAuditEntry } from "@/lib/audit";

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "team_lead" && user.role !== "report_manager" && user.role !== "hod" && user.role !== "admin")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const { id } = await Promise.resolve(params);
  await connectToDatabase();
  const report = await DailyReport.findByIdAndUpdate(
    id,
    {
      status: "approved",
      approvedBy: user.id,
      approvedAt: new Date(),
      rejectionReason: ""
    },
    { new: true }
  );

  if (!report) return NextResponse.json({ success: false, message: "Report not found" }, { status: 404 });

  await logAuditEntry({
    action: "Report Approved",
    userId: user.id,
    userName: user.name,
    reportId: id,
    newValue: { status: "approved" }
  });

  return NextResponse.json({ success: true, data: report });
}
