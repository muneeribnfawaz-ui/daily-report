import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import Notification from "@/models/Notification";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const notifications = await Notification.find({ recipientId: user.id })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const unreadCount = await Notification.countDocuments({
      recipientId: user.id,
      isRead: false
    });

    return NextResponse.json({
      success: true,
      data: { notifications, unreadCount }
    });
  } catch (error) {
    console.error("Failed to fetch notifications", error);
    return NextResponse.json({ success: false, message: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { notificationIds, markAllRead } = body;

    await connectToDatabase();

    if (markAllRead) {
      await Notification.updateMany(
        { recipientId: user.id, isRead: false },
        { $set: { isRead: true } }
      );
    } else if (Array.isArray(notificationIds) && notificationIds.length > 0) {
      await Notification.updateMany(
        { _id: { $in: notificationIds }, recipientId: user.id },
        { $set: { isRead: true } }
      );
    }

    return NextResponse.json({ success: true, message: "Notifications updated" });
  } catch (error) {
    console.error("Failed to update notifications", error);
    return NextResponse.json({ success: false, message: "Failed to update notifications" }, { status: 500 });
  }
}
