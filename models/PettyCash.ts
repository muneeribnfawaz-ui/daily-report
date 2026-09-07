import { Schema, models, model } from "mongoose";

const PettyCashSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, unique: true, index: true },
    balance: { type: Number, required: true, default: 0 },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

if (process.env.NODE_ENV !== "production" && models.PettyCash) {
  delete models.PettyCash;
}

export default models.PettyCash || model("PettyCash", PettyCashSchema);
