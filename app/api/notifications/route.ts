import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    
    const notifications = await db.notification.findMany({
      where: { recipientId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 30
    });

    const unreadCount = await db.notification.count({
      where: {
        recipientId: user.id,
        isRead: false
      }
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

    
    if (markAllRead) {
      await db.notification.updateMany({
        where: { recipientId: user.id, isRead: false },
        data: { isRead: true }
      });
    } else if (Array.isArray(notificationIds) && notificationIds.length > 0) {
      await db.notification.updateMany({
        where: { id: { in: notificationIds }, recipientId: user.id },
        data: { isRead: true }
      });
    }

    return NextResponse.json({ success: true, message: "Notifications updated" });
  } catch (error) {
    console.error("Failed to update notifications", error);
    return NextResponse.json({ success: false, message: "Failed to update notifications" }, { status: 500 });
  }
}
