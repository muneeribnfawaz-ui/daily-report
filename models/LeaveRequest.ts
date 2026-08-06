import { Schema, models, model } from "mongoose";
import { LEAVE_DURATION_OPTIONS, LEAVE_HALF_OPTIONS, LEAVE_TYPE_OPTIONS } from "@/lib/constants";

const LeaveRequestSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    leaveNumber: { type: String, required: true, unique: true, sparse: true },
    name: { type: String, required: true },
    teamName: { type: String, required: true },
    requestedByRole: { type: String, required: true, enum: ["team_member", "team_lead"] },
    leaveType: { type: String, required: true, enum: [...LEAVE_TYPE_OPTIONS] },
    leaveDuration: { type: String, required: true, enum: [...LEAVE_DURATION_OPTIONS], default: "full_day" },
    leaveHalf: { type: String, required: false, enum: [...LEAVE_HALF_OPTIONS], default: null },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      default: "pending_tl",
      enum: ["pending_tl", "forwarded_to_hod", "approved", "rejected", "cancelled"]
    },
    tlReviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    tlReviewedAt: { type: Date, default: null },
    tlComment: { type: String, default: "" },
    hodReviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    hodReviewedAt: { type: Date, default: null },
    hodComment: { type: String, default: "" }
  },
  { timestamps: true }
);

LeaveRequestSchema.index({ employeeId: 1, fromDate: 1, toDate: 1, leaveType: 1 });

if (process.env.NODE_ENV !== "production" && models.LeaveRequest) {
  delete models.LeaveRequest;
}

export default models.LeaveRequest || model("LeaveRequest", LeaveRequestSchema);
