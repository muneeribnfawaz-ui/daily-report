import { Schema, models, model } from "mongoose";

const AuditLogSchema = new Schema(
  {
    action: { type: String, required: true },
    userId: { type: String, default: null },
    userName: { type: String, default: null },
    reportId: { type: String, default: null },
    consolidatedReportId: { type: String, default: null },
    leaveRequestId: { type: String, default: null },
    oldValue: { type: Schema.Types.Mixed, default: null },
    newValue: { type: Schema.Types.Mixed, default: null },
    reason: { type: String, default: null }
  },
  { timestamps: true }
);

export default models.AuditLog || model("AuditLog", AuditLogSchema);
