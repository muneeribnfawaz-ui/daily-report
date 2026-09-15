import { Schema, models, model } from "mongoose";

const TeamTypeSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", index: true },
    name: { type: String, required: true, trim: true },
    showName: { type: String, required: true, trim: true },
    department: { type: String, enum: ["Construction", "Software", "Finance", "Marketing"] },
    subTeams: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: String, default: "" }
  },
  { timestamps: true }
);

TeamTypeSchema.index({ workspaceId: 1, name: 1 }, { unique: true });

export default models.TeamType || model("TeamType", TeamTypeSchema);


