import { NextResponse } from "next/server";
import db from "@/lib/db";
import { toDateInputValue } from "@/lib/date-utils";
import { getCurrentUser, hashPassword, setAuthCookie, verifyPassword } from "@/lib/auth";
import { profileUpdateSchema } from "@/lib/validation";

function normalizeStoredDate(value?: string | null) {
  if (!value) return "";

  const trimmed = value.trim();
  if (!trimmed) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const parsedDate = new Date(trimmed);
  if (Number.isNaN(parsedDate.getTime())) return "";

  return toDateInputValue(parsedDate);
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid profile payload" }, { status: 400 });
  }

    const profile = await db.user.findUnique({ where: { id: String(user.id) } });
  if (!profile) {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  }

  const wantsPasswordChange = Boolean(parsed.data.oldPassword || parsed.data.newPassword || parsed.data.confirmPassword);

  if (wantsPasswordChange) {
    if (!parsed.data.oldPassword || !parsed.data.newPassword || !parsed.data.confirmPassword) {
      return NextResponse.json({ success: false, message: "Complete the password reset fields" }, { status: 400 });
    }

    const matches = await verifyPassword(parsed.data.oldPassword, profile.password);
    if (!matches) {
      return NextResponse.json({ success: false, message: "Current password is incorrect" }, { status: 400 });
    }

    if (parsed.data.newPassword !== parsed.data.confirmPassword) {
      return NextResponse.json({ success: false, message: "Passwords do not match" }, { status: 400 });
    }
  }

  const updateData: any = {
    firstName: parsed.data.firstName.trim(),
    lastName: parsed.data.lastName?.trim() ?? "",
  };
  
  updateData.name = `${updateData.firstName} ${updateData.lastName}`.trim();

  if (wantsPasswordChange && parsed.data.newPassword) {
    updateData.password = await hashPassword(parsed.data.newPassword);
  }

  if (parsed.data.dateOfBirth !== undefined) {
    updateData.dateOfBirth = normalizeStoredDate(parsed.data.dateOfBirth);
  }
  if (parsed.data.secondaryPhone !== undefined) {
    updateData.secondaryPhone = parsed.data.secondaryPhone;
  }

  const updatedProfile = await db.user.update({
    where: { id: profile.id },
    data: updateData
  });

  await setAuthCookie({
    ...user,
    name: updatedProfile.name
  });

  return NextResponse.json({
    success: true,
    data: {
      _id: String(updatedProfile.id),
      firstName: updatedProfile.firstName,
      lastName: updatedProfile.lastName,
      dateOfBirth: updatedProfile.dateOfBirth,
      secondaryPhone: updatedProfile.secondaryPhone,
      name: updatedProfile.name,
      email: updatedProfile.email,
      isEmailActivated: updatedProfile.isEmailActivated,
      empID: (updatedProfile as any).empID,
      createdAt: updatedProfile.createdAt,
      updatedAt: updatedProfile.updatedAt
    }
  });
}
