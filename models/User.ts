import { Schema, models, model } from "mongoose";


const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    dateOfBirth: { type: String, default: "" },
    phone: { type: String, default: "", unique: true, sparse: true },
    secondaryPhone: { type: String, default: "" },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    avatarUrl: { type: String, default: "" },
    password: { type: String, required: true },
    role: { type: String, default: "" },
    isDeleted: { type: Boolean, default: false },
    isAdminActive: { type: Boolean, default: false },
    isEmailActivated: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default models.User || model("User", UserSchema);
