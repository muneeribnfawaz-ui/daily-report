import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { toDateInputValue } from "@/lib/date-utils";
import { getCurrentUser, hashPassword, setAuthCookie, verifyPassword } from "@/lib/auth";
import User from "@/models/User";
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

  await connectToDatabase();
  const profile = await User.findById(user.id);
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

    profile.password = await hashPassword(parsed.data.newPassword);
  }

  profile.firstName = parsed.data.firstName.trim();
  profile.lastName = parsed.data.lastName.trim();
  if (parsed.data.dateOfBirth !== undefined) {
    profile.dateOfBirth = normalizeStoredDate(parsed.data.dateOfBirth);
  }
  if (parsed.data.secondaryPhone !== undefined) {
    profile.secondaryPhone = parsed.data.secondaryPhone;
  }
  profile.name = `${profile.firstName} ${profile.lastName}`.trim();

  await profile.save();

  await setAuthCookie({
    id: String(profile._id),
    name: profile.name,
    email: profile.email,
    role: profile.role,
    teamName: profile.teamName,
    status: profile.status
  });

  return NextResponse.json({
    success: true,
    data: {
      _id: String(profile._id),
      firstName: profile.firstName,
      lastName: profile.lastName,
      dateOfBirth: profile.dateOfBirth,
      secondaryPhone: profile.secondaryPhone,
      name: profile.name,
      email: profile.email,
      role: profile.role,
      teamName: profile.teamName,
      managerName: profile.managerName,
      status: profile.status,
      isEmailActivated: profile.isEmailActivated,
      empID: profile.empID,
      teamNames: profile.teamNames ?? [],
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt
    }
  });
}
