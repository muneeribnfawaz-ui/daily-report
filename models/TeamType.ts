import { Construction } from "lucide-react";
import { Schema, models, model } from "mongoose";

const TeamTypeSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    showName: { type: String, required: true, trim: true },
    subTeams: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: String, default: "" }
  },
  { timestamps: true }
);

export default models.TeamType || model("TeamType", TeamTypeSchema);

