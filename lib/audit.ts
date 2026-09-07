import db from "@/lib/db";

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
  return db.auditLog.create({
    data: {
      action: input.action,
      userId: input.userId ?? null,
      userName: input.userName ?? null,
      reportId: input.reportId ?? null,
      consolidatedReportId: input.consolidatedReportId ?? null,
      financeReportId: input.financeReportId ?? null,
      leaveRequestId: input.leaveRequestId ?? null,
      oldValue: input.oldValue !== undefined ? (input.oldValue as any) : null,
      newValue: input.newValue !== undefined ? (input.newValue as any) : null,
      reason: input.reason ?? null
    }
  });
}
