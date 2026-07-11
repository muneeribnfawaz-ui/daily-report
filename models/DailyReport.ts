import { Schema, models, model } from "mongoose";

const DailyReportSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    teamName: { type: String, required: true },
    reportType: { type: String, required: true, enum: ["Daily Update", "Bug Fix", "Meeting Notes", "Blocker", "Attendance", "Other"] },
    reportDate: { type: Date, required: true },
    attachmentLink: { type: String, default: "" },
    dailyMeetingUpdate: { type: String, default: "" },
    completedWork: { type: String, required: true },
    pendingWork: { type: String, default: "" },
    blockers: { type: String, default: "" },
    requiredClarification: { type: String, default: "" },
    status: { type: String, default: "submitted", enum: ["draft", "submitted", "under_review", "approved", "rejected", "locked"] },
    rejectionReason: { type: String, default: "" },
    submittedAt: { type: Date, default: Date.now },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
    editAccessRequested: { type: Boolean, default: false },
    editAccessRequestReason: { type: String, default: "" },
    editAccessRequestedAt: { type: Date, default: null },
    editAccessGranted: { type: Boolean, default: false },
    editAccessGrantedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    editAccessGrantedAt: { type: Date, default: null },
    isLocked: { type: Boolean, default: false },
    lockedAt: { type: Date, default: null },
    lockedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    nextDayApprovalItems: {
      type: [
        {
          particulars: { type: String, default: "" },
          amountINR: { type: Number, default: 0 },
          amountRiyal: { type: Number, default: 0 },
          reason: { type: String, default: "" },
          review: { type: String, default: "" },
          approval: { type: String, default: "pending", enum: ["pending", "yes", "no"] }
        }
      ],
      default: []
    },
    consolidatedReportId: { type: Schema.Types.ObjectId, ref: "ConsolidatedReport", default: null }
  },
  { timestamps: true }
);

DailyReportSchema.index({ employeeId: 1, teamName: 1, reportDate: 1 }, { unique: true });

if (process.env.NODE_ENV !== "production" && models.DailyReport) {
  delete models.DailyReport;
}

export default models.DailyReport || model("DailyReport", DailyReportSchema);
