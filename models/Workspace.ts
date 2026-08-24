import { Schema, models, model } from "mongoose";

const WorkspaceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    code: { type: String, trim: true, default: "" },
    type: { type: String, enum: ["ceo", "company"], default: "company" },
    description: { type: String, trim: true, default: "" },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: String, default: "" }
  },
  { timestamps: true }
);

export default models.Workspace || model("Workspace", WorkspaceSchema);
