import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import User from "@/models/User";
import { adminUpdateUserSchema } from "@/lib/validation";
import { getActiveTeamTypeNames } from "@/lib/team-types";

type TargetUser = {
  managerName?: string | null;
  role?: string | null;
  teamName?: string | null;
  teamNames?: string[] | null;
};

function normalizeTeamNames(teamName?: string | null, teamNames?: string[] | null) {
  const values = [teamName, ...(teamNames ?? [])]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set(values));
}

function canEditUser(editor: { id: string; name: string; role: string }, target: TargetUser) {
  if (editor.role === "admin" || editor.role === "ceo") return true;
  if (target.role === "admin" || target.role === "ceo") return false;
  return target.managerName === editor.name;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const { id } = await Promise.resolve(params);
  await connectToDatabase();
  const target = (await User.findById(id).lean()) as TargetUser | null;

  if (!target) {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  }

  if (!canEditUser(user, target)) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    success: true,
    data: {
      ...target,
      teamNames: target.teamNames?.length ? target.teamNames : target.teamName ? [target.teamName] : []
    }
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const { id } = await Promise.resolve(params);
  const body = await request.json();
  const parsed = adminUpdateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid user payload" }, { status: 400 });
  }

  await connectToDatabase();
  const validTeamNames = await getActiveTeamTypeNames();
  const target = await User.findById(id);
  if (!target) {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  }

  if (!canEditUser(user, target)) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const nextRole = parsed.data.role ?? target.role;
  if ((nextRole === "admin" || nextRole === "ceo") && user.role !== "admin" && user.role !== "ceo") {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  if (parsed.data.email !== undefined && user.role !== "admin" && user.role !== "ceo") {
    return NextResponse.json({ success: false, message: "Only admin can update email" }, { status: 403 });
  }

  if (parsed.data.managerName && user.role !== "admin" && user.role !== "ceo" && user.role !== "hod") {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  if (parsed.data.resetPassword && user.role !== "admin" && user.role !== "ceo" && user.role !== "hod") {
    return NextResponse.json({ success: false, message: "Only Admin, CEO, or HOD can reset passwords" }, { status: 403 });
  }

  if (parsed.data.email) {
    const duplicate = await User.findOne({
      email: parsed.data.email.toLowerCase(),
      _id: { $ne: target._id }
    }).lean();
    if (duplicate) {
      return NextResponse.json({ success: false, message: "A user with this email already exists" }, { status: 409 });
    }
  }

  if (parsed.data.phone !== undefined) {
    const duplicatePhone = await User.findOne({
      phone: parsed.data.phone,
      _id: { $ne: target._id }
    }).lean();
    if (duplicatePhone) {
      return NextResponse.json({ success: false, message: "A user with this phone number already exists" }, { status: 409 });
    }
  }

  if (parsed.data.teamNames?.length) {
    const invalidTeamName = parsed.data.teamNames.find((teamName) => !validTeamNames.includes(teamName));
    if (invalidTeamName) {
      return NextResponse.json({ success: false, message: `Unknown team type: ${invalidTeamName}` }, { status: 400 });
    }

    if (user.role === "team_lead") {
      const allowedTeamNames = normalizeTeamNames(user.teamName ?? null, user.teamNames ?? null);
      const invalidTeamLeadTeamName = parsed.data.teamNames.find((teamName) => !allowedTeamNames.includes(teamName));
      if (invalidTeamLeadTeamName) {
        return NextResponse.json(
          { success: false, message: `Team leads can only assign users to their selected team: ${invalidTeamLeadTeamName}` },
          { status: 403 }
        );
      }
    }
  }

  if (parsed.data.resetPassword) {
    if (!parsed.data.newPassword) {
      return NextResponse.json({ success: false, message: "New password is required" }, { status: 400 });
    }

    if (parsed.data.newPassword !== parsed.data.confirmPassword) {
      return NextResponse.json({ success: false, message: "Passwords do not match" }, { status: 400 });
    }

    target.password = await hashPassword(parsed.data.newPassword);
  }

  if (parsed.data.firstName !== undefined) target.firstName = parsed.data.firstName;
  if (parsed.data.lastName !== undefined) target.lastName = parsed.data.lastName;
  if (parsed.data.phone !== undefined) target.phone = parsed.data.phone;
  if (parsed.data.empID !== undefined) target.empID = parsed.data.empID;
  if (parsed.data.email !== undefined) target.email = parsed.data.email.toLowerCase();
  if (parsed.data.role !== undefined) target.role = parsed.data.role;
  if (parsed.data.roleTypes !== undefined) target.roleTypes = parsed.data.roleTypes;
  if (parsed.data.teamNames !== undefined) {
    target.teamNames = parsed.data.teamNames;
    target.teamName = parsed.data.teamNames[0] ?? target.teamName;
  }
  if (parsed.data.departments !== undefined) target.departments = parsed.data.departments;
  if (parsed.data.managerName !== undefined) target.managerName = parsed.data.managerName;
  if (parsed.data.status !== undefined) target.status = parsed.data.status;
  if (parsed.data.isActive !== undefined) target.isActive = parsed.data.isActive;
  if (parsed.data.isDeleted !== undefined) target.isDeleted = parsed.data.isDeleted;
  if (parsed.data.isAdminActive !== undefined) target.isAdminActive = parsed.data.isAdminActive;
  if (parsed.data.isEmailActivated !== undefined) target.isEmailActivated = parsed.data.isEmailActivated;

  target.name = `${target.firstName} ${target.lastName}`.trim();

  await target.save();

  return NextResponse.json({ success: true, data: target });
}
