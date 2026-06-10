import { Schema, models, model } from "mongoose";
import { AUTH_ROLE_OPTIONS } from "@/lib/constants";

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    dateOfBirth: { type: String, default: "" },
    phone: { type: String, default: "", unique: true, sparse: true },
    secondaryPhone: { type: String, default: "" },
    empID: { type: String, default: "" },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    avatarUrl: { type: String, default: "" },
    password: { type: String, required: true },
    role: { type: String, required: true, enum: AUTH_ROLE_OPTIONS },
    roleTypes: { type: [String], default: [] },
    teamName: { type: String, required: true },
    teamNames: { type: [String], default: [] },
    managerName: { type: String, default: "" },
    status: { type: String, default: "active", enum: ["active", "inactive", "suspended"] },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    isAdminActive: { type: Boolean, default: false },
    isEmailActivated: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default models.User || model("User", UserSchema);
