import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser, hashPassword } from "@/lib/auth";

import { adminUpdateUserSchema } from "@/lib/validation";
import { getActiveTeamTypeNames } from "@/lib/team-types";
import { ApiResponse } from "@/lib/api-response";
import { authorizeApi } from "@/lib/api-auth";
import { canUpdateEmail } from "@/lib/permissions";
import { normalizeEmpId } from "@/lib/utils";

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
  let workspaceId = url.searchParams.get("workspaceId") || request.headers.get("x-workspace-id");
  
  if (!workspaceId && user.role !== "admin" && user.role !== "ceo") {
    workspaceId = user.workspaceId;
  }

  const targetUser = await db.user.findUnique({ where: { id: String(id) } }) as any;
  if (!targetUser) {
    return ApiResponse.notFound("User not found");
  }

  let targetMember = null;
  if (workspaceId && workspaceId !== "all") {
    targetMember = await db.workspaceMember.findFirst({ where: { userId: id, workspaceId }, include: { departments: true } }) as any;
  }

  const flattened = targetMember ? { ...targetUser, ...targetMember } : targetUser;

  // CEO Details Access Control: CEO details can only be viewed by Admin and that CEO himself
  if (targetUser.role === "ceo" || flattened.role === "ceo") {
    if (user.role !== "admin" && user.id !== String(targetUser.id)) {
      return ApiResponse.forbidden("CEO details can only be accessed by Administrators or the CEO themselves.");
    }
  } else if (!canEditUser(user, flattened)) {
    return ApiResponse.forbidden("Forbidden");
  }

  const validTeamNames = await getActiveTeamTypeNames();
  const filteredTeamNames = (flattened.teamNames || []).filter((name: string) => validTeamNames.includes(name));
  const primaryTeamName = validTeamNames.includes(flattened.teamName) ? flattened.teamName : (filteredTeamNames[0] || null);

  return ApiResponse.success({
    ...flattened,
    teamName: primaryTeamName,
    teamNames: filteredTeamNames
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

  const targetWorkspaceId = parsed.data.workspaceId && parsed.data.workspaceId !== "all" ? parsed.data.workspaceId : undefined;
  const validTeamNames = await getActiveTeamTypeNames(targetWorkspaceId);
  
  const targetUser = await db.user.findUnique({ where: { id: String(id) } });
  if (!targetUser) {
    return ApiResponse.notFound("User not found");
  }

  const isExecutive = targetUser.role === "admin" || targetUser.role === "ceo" || parsed.data.role === "admin" || parsed.data.role === "ceo";

  let targetMember = null;
  if (parsed.data.workspaceId && parsed.data.workspaceId !== "all") {
    targetMember = await db.workspaceMember.findFirst({ where: { userId: id, workspaceId: parsed.data.workspaceId } });
  }

  // Only require workspaceId and targetMember for non-executive users
  if (!isExecutive && !parsed.data.workspaceId) {
    return ApiResponse.validationError("workspaceId is required");
  }
  if (!isExecutive && !targetMember) {
    return ApiResponse.notFound("Workspace member not found");
  }

  const flattenedTarget = targetMember ? { ...targetUser, ...targetMember } : targetUser;

  // CEO Details Access Control: CEO profile can only be edited by Admin and that CEO himself
  if (targetUser.role === "ceo" || flattenedTarget.role === "ceo") {
    if (user.role !== "admin" && user.id !== String(targetUser.id)) {
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

  if (parsed.data.email !== undefined) {
    const isSelfUpdate = user.id === targetUser.id;
    const targetRole = targetUser.role || flattenedTarget.role;

    if (!canUpdateEmail(user.role, targetRole, isSelfUpdate)) {
      return ApiResponse.forbidden("Only admin can update email or update email of senior/peer roles");
    }
  }

  if (parsed.data.managerName !== undefined && parsed.data.managerName !== ((flattenedTarget as any).managerName || "") && user.role !== "admin" && user.role !== "ceo" && user.role !== "hod") {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  if (parsed.data.resetPassword && user.role !== "admin" && user.role !== "ceo" && user.role !== "hod") {
    return NextResponse.json({ success: false, message: "Only Admin, CEO, or HOD can reset passwords" }, { status: 403 });
  }

  if (parsed.data.email) {
    const duplicate = await db.user.findFirst({
      where: {
        email: parsed.data.email.toLowerCase(),
        id: { not: targetUser.id }
      }
    });
    if (duplicate) {
      return NextResponse.json({ success: false, message: "A user with this email already exists" }, { status: 409 });
    }
  }

  if (parsed.data.phone !== undefined && parsed.data.phone.trim() !== "") {
    const duplicatePhone = await db.user.findFirst({
      where: {
        phone: parsed.data.phone,
        id: { not: targetUser.id }
      }
    });
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
  const updateUserData: any = {};
  if (parsed.data.firstName !== undefined) updateUserData.firstName = parsed.data.firstName;
  if (parsed.data.lastName !== undefined) updateUserData.lastName = parsed.data.lastName;
  if (parsed.data.phone !== undefined) updateUserData.phone = parsed.data.phone;
  if (parsed.data.email !== undefined) updateUserData.email = parsed.data.email.toLowerCase();
  if (parsed.data.isDeleted !== undefined) updateUserData.isDeleted = parsed.data.isDeleted;
  if (parsed.data.isAdminActive !== undefined) updateUserData.isAdminActive = parsed.data.isAdminActive;
  if (parsed.data.isEmailActivated !== undefined) updateUserData.isEmailActivated = parsed.data.isEmailActivated;
  if (parsed.data.firstName !== undefined || parsed.data.lastName !== undefined) {
    const fn = parsed.data.firstName ?? targetUser.firstName;
    const ln = parsed.data.lastName ?? targetUser.lastName;
    updateUserData.name = `${fn} ${ln}`.trim();
  }
  if (parsed.data.resetPassword) updateUserData.password = targetUser.password;

  const rawEmpId = parsed.data.empID !== undefined ? parsed.data.empID.trim() : undefined;
  const normalizedEmpId = rawEmpId !== undefined ? normalizeEmpId(rawEmpId) : undefined;

  if (targetMember && rawEmpId !== undefined && normalizedEmpId) {
    const duplicateEmpId = await (db.workspaceMember as any).findFirst({
      where: {
        workspaceId: targetMember.workspaceId,
        id: { not: targetMember.id },
        OR: [
          { empIDNormalized: normalizedEmpId },
          { empID: { equals: rawEmpId, mode: "insensitive" } }
        ]
      }
    });
    if (duplicateEmpId) {
      return ApiResponse.error("Employee ID already exists. Please enter a unique Employee ID.", 2004, 409);
    }
  } else if (!targetMember && parsed.data.workspaceId && rawEmpId !== undefined && normalizedEmpId) {
    const duplicateEmpId = await (db.workspaceMember as any).findFirst({
      where: {
        workspaceId: parsed.data.workspaceId,
        OR: [
          { empIDNormalized: normalizedEmpId },
          { empID: { equals: rawEmpId, mode: "insensitive" } }
        ]
      }
    });
    if (duplicateEmpId) {
      return ApiResponse.error("Employee ID already exists. Please enter a unique Employee ID.", 2004, 409);
    }
  }

  const updatedUser = await db.user.update({
    where: { id: targetUser.id },
    data: updateUserData
  });

  // Update Workspace Member if it exists
  if (targetMember) {
    const updateMemberData: any = {};
    if (parsed.data.empID !== undefined) {
      updateMemberData.empID = rawEmpId;
      updateMemberData.empIDNormalized = normalizedEmpId || null;
    }
    if (parsed.data.role !== undefined) updateMemberData.role = parsed.data.role;
    if (parsed.data.roleTypes !== undefined) updateMemberData.roleTypes = parsed.data.roleTypes;
    if (parsed.data.teamNames !== undefined) {
      updateMemberData.teamNames = parsed.data.teamNames;
      updateMemberData.teamName = parsed.data.teamNames[0] || "";
    }
    if (parsed.data.managerName !== undefined) updateMemberData.managerName = parsed.data.managerName;
    if (parsed.data.status !== undefined) updateMemberData.status = parsed.data.status;
    if (parsed.data.isActive !== undefined) updateMemberData.isActive = parsed.data.isActive;

    try {
      const updatedMember = await (db.workspaceMember as any).update({
        where: { id: targetMember.id },
        data: {
          ...updateMemberData,
          departments: parsed.data.departments ? {
            deleteMany: {},
            create: parsed.data.departments.map((d: any) => ({ name: d.name, subTeams: d.subTeams }))
          } : undefined
        },
        include: { departments: true }
      });
      return ApiResponse.success({ ...updatedUser, ...updatedMember }, "User updated successfully");
    } catch (dbError: any) {
      if (dbError?.code === "P2002" || String(dbError?.message).includes("empID") || String(dbError?.message).includes("Unique constraint")) {
        return ApiResponse.error("Employee ID already exists. Please enter a unique Employee ID.", 2004, 409);
      }
      throw dbError;
    }
  }

  // Create WorkspaceMember if workspaceId is provided but not found
  if (parsed.data.workspaceId && parsed.data.workspaceId.trim() !== "") {
    try {
      const newMember = await (db.workspaceMember as any).create({
        data: {
          userId: updatedUser.id,
          workspaceId: parsed.data.workspaceId,
          empID: rawEmpId || "EMP",
          empIDNormalized: normalizedEmpId || "emp",
          role: parsed.data.role || updatedUser.role,
          roleTypes: parsed.data.roleTypes ?? [],
          teamNames: parsed.data.teamNames ?? [],
          departments: {
            create: parsed.data.departments?.map((d: any) => ({ name: d.name, subTeams: d.subTeams })) || []
          },
          managerName: parsed.data.managerName ?? "",
          status: "active",
          isActive: true
        },
        include: { departments: true }
      });
      return ApiResponse.success({ ...updatedUser, ...newMember }, "User updated successfully");
    } catch (dbError: any) {
      if (dbError?.code === "P2002" || String(dbError?.message).includes("empID") || String(dbError?.message).includes("Unique constraint")) {
        return ApiResponse.error("Employee ID already exists. Please enter a unique Employee ID.", 2004, 409);
      }
      throw dbError;
    }
  }

  return ApiResponse.success(updatedUser, "User updated successfully");
}
