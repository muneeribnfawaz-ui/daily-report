import { connectToDatabase } from "@/lib/db";
import AuditLog from "@/models/AuditLog";

export async function logAuditEntry(input: {
  action: string;
  userId?: string | null;
  userName?: string | null;
  reportId?: string | null;
  consolidatedReportId?: string | null;
  financeReportId?: string | null;
  leaveRequestId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string | null;
}) {
  await connectToDatabase();
  return AuditLog.create({
    action: input.action,
    userId: input.userId ?? null,
    userName: input.userName ?? null,
    reportId: input.reportId ?? null,
    consolidatedReportId: input.consolidatedReportId ?? null,
    financeReportId: input.financeReportId ?? null,
    leaveRequestId: input.leaveRequestId ?? null,
    oldValue: input.oldValue ?? null,
    newValue: input.newValue ?? null,
    reason: input.reason ?? null
  });
}
