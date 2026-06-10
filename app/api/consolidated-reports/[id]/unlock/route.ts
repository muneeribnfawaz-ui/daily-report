import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import DailyReport from "@/models/DailyReport";
import { unlockReportSchema } from "@/lib/validation";
import { logAuditEntry } from "@/lib/audit";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "team_lead" && user.role !== "report_manager" && user.role !== "hod" && user.role !== "admin")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = unlockReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Reason is required to unlock reports" }, { status: 400 });
  }

  const { id } = await Promise.resolve(params);
  await connectToDatabase();
  await DailyReport.updateMany(
    { consolidatedReportId: id },
    { $set: { isLocked: false, lockedAt: null, lockedBy: null, status: "approved" } }
  );

  await logAuditEntry({
    action: "Report Unlocked",
    userId: user.id,
    userName: user.name,
    consolidatedReportId: id,
    reason: parsed.data.reason
  });

  return NextResponse.json({ success: true, data: { id, unlocked: true, reason: parsed.data.reason } });
}
