import { Schema, models, model } from "mongoose";

const NotificationSchema = new Schema(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      required: true,
      enum: [
        "finance_approval_request",
        "finance_approved",
        "finance_rejected",
        "finance_forwarded",
        "report_approved",
        "report_verified",
        "report_rejected"
      ]
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    isRead: { type: Boolean, default: false },
    linkUrl: { type: String, default: "" }
  },
  { timestamps: true }
);

NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

if (process.env.NODE_ENV !== "production" && models.Notification) {
  delete models.Notification;
}

export default models.Notification || model("Notification", NotificationSchema);
