import { Schema, models, model } from "mongoose";
import { AUTH_ROLE_OPTIONS } from "@/lib/constants";

const WorkspaceMemberSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
    empID: { type: String, default: "" },
    role: { type: String, required: true, enum: AUTH_ROLE_OPTIONS },
    roleTypes: { type: [String], default: [] },
    departments: {
      type: [
        {
          name: {
            type: String,
            enum: ["Construction", "Software", "Finance", "Marketing"],
            required: true
          },
          subTeams: {
            type: [String],
            enum: ["Physical", "Digital"],
            default: [],
            validate: {
              validator: function (this: any, v: string[]) {
                if (this.name !== "Marketing" && v && v.length > 0) return false;
                return true;
              },
              message: "Sub-teams are only allowed for Marketing."
            }
          }
        }
      ],
      default: []
    },
    managerName: { type: String, default: "" },
    status: { type: String, default: "active", enum: ["active", "inactive", "suspended"] },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

WorkspaceMemberSchema.index({ userId: 1, workspaceId: 1 }, { unique: true });
WorkspaceMemberSchema.index({ workspaceId: 1, role: 1 });

export default models.WorkspaceMember || model("WorkspaceMember", WorkspaceMemberSchema);
