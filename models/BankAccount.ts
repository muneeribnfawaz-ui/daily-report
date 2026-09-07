import { Schema, models, model } from "mongoose";

const BankAccountSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    bankName: { type: String, required: true, trim: true },
    accountNumber: { type: String, required: true, trim: true },
    ifscCode: { type: String, default: "", trim: true },
    iban: { type: String, default: "", trim: true },
    branchName: { type: String, default: "", trim: true },
    currency: { type: String, default: "INR", uppercase: true },
    openingBalance: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

BankAccountSchema.index({ workspaceId: 1, bankName: 1 });
BankAccountSchema.index({ accountNumber: 1 }, { unique: true, sparse: true });

if (process.env.NODE_ENV !== "production" && models.BankAccount) {
  delete models.BankAccount;
}

export default models.BankAccount || model("BankAccount", BankAccountSchema);
