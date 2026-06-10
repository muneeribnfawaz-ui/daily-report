import { Schema, models, model } from "mongoose";

const ConsolidatedReportSchema = new Schema(
  {
    title: { type: String, required: true },
    reportDate: { type: Date, required: true },
    dateFrom: { type: Date, required: true },
    dateTo: { type: Date, required: true },
    generatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    generatedAt: { type: Date, default: Date.now },
    teamNames: [{ type: String, required: true }],
    employeeCount: { type: Number, default: 0 },
    reportCount: { type: Number, default: 0 },
    pdfPath: { type: String, default: "" },
    status: { type: String, default: "draft", enum: ["draft", "finalized", "archived"] },
    remarks: { type: String, default: "" }
  },
  { timestamps: true }
);

export default models.ConsolidatedReport || model("ConsolidatedReport", ConsolidatedReportSchema);
