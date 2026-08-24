import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import User from "@/models/User";
import WorkspaceMember from "@/models/WorkspaceMember";
import { isValidObjectId } from "mongoose";
import { adminUpdateUserSchema } from "@/lib/validation";
import { getActiveTeamTypeNames } from "@/lib/team-types";
import { ApiResponse } from "@/lib/api-response";
import { authorizeApi } from "@/lib/api-auth";

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

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApi(["authenticated"]);
  if (!auth.authorized) return auth.response;
  const user = auth.user;

  const { id } = await Promise.resolve(params);
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspaceId");

  await connectToDatabase();
  const targetUser = await User.findById(id).lean() as any;
  if (!targetUser) {
    return ApiResponse.notFound("User not found");
  }

  let targetMember = null;
  if (workspaceId && workspaceId !== "all" && isValidObjectId(workspaceId)) {
    targetMember = await WorkspaceMember.findOne({ userId: id, workspaceId }).lean() as any;
  }

  const flattened = targetMember ? { ...targetUser, ...targetMember } : targetUser;

  // CEO Details Access Control: CEO details can only be viewed by Admin and that CEO himself
  if (targetUser.role === "ceo" || flattened.role === "ceo") {
    if (user.role !== "admin" && user.id !== String(targetUser._id)) {
      return ApiResponse.forbidden("CEO details can only be accessed by Administrators or the CEO themselves.");
    }
  } else if (!canEditUser(user, flattened)) {
    return ApiResponse.forbidden("Forbidden");
  }

  return ApiResponse.success({
    ...flattened,
    teamNames: flattened.departments?.map((d: any) => d.name) || []
  }, "User details fetched successfully");
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApi(["authenticated"]);
  if (!auth.authorized) return auth.response;
  const user = auth.user;

  const { id } = await Promise.resolve(params);
  const body = await request.json();
  const parsed = adminUpdateUserSchema.safeParse(body);
  if (!parsed.success) {
    return ApiResponse.validationError("Invalid user payload", parsed.error.format());
  }

  await connectToDatabase();
  const validTeamNames = await getActiveTeamTypeNames();
  
  const targetUser = await User.findById(id);
  if (!targetUser) {
    return ApiResponse.notFound("User not found");
  }

  const isExecutive = targetUser.role === "admin" || targetUser.role === "ceo" || parsed.data.role === "admin" || parsed.data.role === "ceo";

  let targetMember = null;
  if (parsed.data.workspaceId && parsed.data.workspaceId !== "all" && isValidObjectId(parsed.data.workspaceId)) {
    targetMember = await WorkspaceMember.findOne({ userId: id, workspaceId: parsed.data.workspaceId });
  }

  // Only require workspaceId and targetMember for non-executive users
  if (!isExecutive && !parsed.data.workspaceId) {
    return ApiResponse.validationError("workspaceId is required");
  }
  if (!isExecutive && !targetMember) {
    return ApiResponse.notFound("Workspace member not found");
  }

  const flattenedTarget = targetMember ? { ...targetUser.toObject(), ...targetMember.toObject() } : targetUser.toObject();

  // CEO Details Access Control: CEO profile can only be edited by Admin and that CEO himself
  if (targetUser.role === "ceo" || flattenedTarget.role === "ceo") {
    if (user.role !== "admin" && user.id !== String(targetUser._id)) {
      return ApiResponse.forbidden("CEO profile can only be edited by Administrators or the CEO themselves.");
    }
  } else if (!canEditUser(user, flattenedTarget)) {
    return ApiResponse.forbidden("Forbidden");
  }

  const nextRole = parsed.data.role ?? flattenedTarget.role;
  if (parsed.data.role === "ceo" && user.role !== "admin") {
    return ApiResponse.forbidden("Only Administrators can assign or change role to CEO.");
  }

  if ((nextRole === "admin" || nextRole === "ceo") && user.role !== "admin" && user.role !== "ceo") {
    return ApiResponse.forbidden("Forbidden");
  }

  if (parsed.data.email !== undefined && user.role !== "admin" && user.role !== "ceo") {
    return ApiResponse.forbidden("Only admin can update email");
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
      _id: { $ne: targetUser._id }
    }).lean();
    if (duplicate) {
      return NextResponse.json({ success: false, message: "A user with this email already exists" }, { status: 409 });
    }
  }

  if (parsed.data.phone !== undefined && parsed.data.phone.trim() !== "") {
    const duplicatePhone = await User.findOne({
      phone: parsed.data.phone,
      _id: { $ne: targetUser._id }
    }).lean();
    if (duplicatePhone) {
      return NextResponse.json({ success: false, message: "A user with this phone number already exists" }, { status: 409 });
    }
  }

  if (parsed.data.resetPassword) {
    if (!parsed.data.newPassword) {
      return NextResponse.json({ success: false, message: "New password is required" }, { status: 400 });
    }

    if (parsed.data.newPassword !== parsed.data.confirmPassword) {
      return NextResponse.json({ success: false, message: "Passwords do not match" }, { status: 400 });
    }

    targetUser.password = await hashPassword(parsed.data.newPassword);
  }

  // Update Global User
  if (parsed.data.firstName !== undefined) targetUser.firstName = parsed.data.firstName;
  if (parsed.data.lastName !== undefined) targetUser.lastName = parsed.data.lastName;
  if (parsed.data.phone !== undefined) targetUser.phone = parsed.data.phone;
  if (parsed.data.email !== undefined) targetUser.email = parsed.data.email.toLowerCase();
  if (parsed.data.isDeleted !== undefined) targetUser.isDeleted = parsed.data.isDeleted;
  if (parsed.data.isAdminActive !== undefined) targetUser.isAdminActive = parsed.data.isAdminActive;
  if (parsed.data.isEmailActivated !== undefined) targetUser.isEmailActivated = parsed.data.isEmailActivated;

  targetUser.name = `${targetUser.firstName} ${targetUser.lastName}`.trim();
  await targetUser.save();

  // Update Workspace Member if it exists
  if (targetMember) {
    if (parsed.data.empID !== undefined) targetMember.empID = parsed.data.empID;
    if (parsed.data.role !== undefined) targetMember.role = parsed.data.role;
    if (parsed.data.roleTypes !== undefined) targetMember.roleTypes = parsed.data.roleTypes;
    if (parsed.data.departments !== undefined) targetMember.departments = parsed.data.departments;
    if (parsed.data.managerName !== undefined) targetMember.managerName = parsed.data.managerName;
    if (parsed.data.status !== undefined) targetMember.status = parsed.data.status;
    if (parsed.data.isActive !== undefined) targetMember.isActive = parsed.data.isActive;

    await targetMember.save();
    return ApiResponse.success({ ...targetUser.toObject(), ...targetMember.toObject() }, "User updated successfully");
  }

  // Create WorkspaceMember if workspaceId is provided but not found
  if (parsed.data.workspaceId && parsed.data.workspaceId.trim() !== "") {
    const newMember = await WorkspaceMember.create({
      userId: targetUser._id,
      workspaceId: parsed.data.workspaceId,
      empID: parsed.data.empID || "EMP",
      role: parsed.data.role || targetUser.role,
      roleTypes: parsed.data.roleTypes ?? [],
      departments: parsed.data.departments ?? [],
      managerName: parsed.data.managerName ?? "",
      status: "active",
      isActive: true
    });
    return ApiResponse.success({ ...targetUser.toObject(), ...newMember.toObject() }, "User updated successfully");
  }

  return ApiResponse.success(targetUser.toObject(), "User updated successfully");
}
