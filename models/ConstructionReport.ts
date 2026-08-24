import { Schema, models, model } from "mongoose";

const ConstructionReportSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    reportDate: { type: Date, required: true },
    submittedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    submittedByName: { type: String, required: true },

    workPlan: [
      {
        activity: { type: String, required: true },
        location: { type: String, required: true },
        unit: { type: String, required: true },
        plannedQuantity: { type: Number, required: true },
        executedQuantity: { type: Number, required: true },
        completionPercentage: { type: Number, required: true },
        remarks: { type: String, default: "" }
      }
    ],

    materialUtilization: [
      {
        material: { type: String, required: true },
        unit: { type: String, required: true },
        openingStock: { type: Number, required: true },
        received: { type: Number, default: 0 },
        closingStock: { type: Number, required: true }
      }
    ],

    tomorrowsWorkPlan: [
      {
        activity: { type: String, required: true },
        location: { type: String, required: true },
        unit: { type: String, required: true },
        plannedQuantity: { type: Number, required: true }
      }
    ],

    photos: [{ type: String }], // Array of URLs or paths for Site Execution Photos

    // Approval workflow
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "approved", "rejected"]
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    approvedByName: { type: String, default: "" },
    approvedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: "" }
  },
  { timestamps: true }
);

ConstructionReportSchema.index({ workspaceId: 1, reportDate: 1 }, { unique: true });
ConstructionReportSchema.index({ workspaceId: 1, submittedBy: 1, reportDate: -1 });
ConstructionReportSchema.index({ status: 1 });

if (process.env.NODE_ENV !== "production" && models.ConstructionReport) {
  delete models.ConstructionReport;
}

export default models.ConstructionReport || model("ConstructionReport", ConstructionReportSchema);
