import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import User from "@/models/User";
import WorkspaceMember from "@/models/WorkspaceMember";
import { adminCreateUserSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/auth";
import { getActiveTeamTypeNames, getActiveTeamTypeShowNameMap } from "@/lib/team-types";
import { getUserTeamLabel, sortUsersForDirectory } from "@/lib/user-directory-sort";
import { ApiResponse } from "@/lib/api-response";
import { authorizeApi } from "@/lib/api-auth";

import TeamType from "@/models/TeamType";

function normalizeTeamNames(teamName?: string | null, teamNames?: string[] | null) {
  const values = [teamName, ...(teamNames ?? [])]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set(values));
}

export async function GET(request: Request) {
  const auth = await authorizeApi(["admin", "ceo"]);
  if (!auth.authorized) return auth.response;
  const user = auth.user;

  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim();
  const role = url.searchParams.get("role");
  const status = url.searchParams.get("status");
  let workspaceId = url.searchParams.get("workspaceId") || request.headers.get("x-workspace-id");
  if (!workspaceId && user.role !== "admin" && role !== "ceo") {
    workspaceId = user.workspaceId;
  }
  if (!workspaceId && user.role !== "admin" && role !== "ceo") {
    return ApiResponse.validationError("workspaceId is required");
  }

  await connectToDatabase();
  const teamTypeShowNameMap = await getActiveTeamTypeShowNameMap();

  const filter: Record<string, any> = {};
  if (role) filter.role = role;
  if (status) filter.status = status;

  if (user.role !== "admin") {
    const memberships = await WorkspaceMember.find({
      userId: user.id,
      status: "active",
      isActive: true
    }).select("workspaceId").lean() as any[];
    const allowedWorkspaceIds = memberships.map(m => String(m.workspaceId));

    if (workspaceId && workspaceId !== "all") {
      filter.workspaceId = allowedWorkspaceIds.includes(workspaceId) ? workspaceId : "non_existent_id";
    } else {
      filter.workspaceId = { $in: allowedWorkspaceIds };
    }
  } else {
    if (workspaceId && workspaceId !== "all") {
      filter.workspaceId = workspaceId;
    }
  }

  // We find WorkspaceMembers and populate the User document
  const members = await WorkspaceMember.find(filter).populate("userId").sort({ createdAt: -1 }).lean() as any[];

  // Fetch global executive users (admin, ceo) who do not have WorkspaceMember records
  // Only display them for Admin users, since CEO only sees their own workspace items.
  const executiveFilter: Record<string, unknown> = {
    role: { $in: ["admin", "ceo"] },
    isDeleted: { $ne: true }
  };
  if (role && (role === "admin" || role === "ceo")) {
    executiveFilter.role = role;
  }
  const executiveUsers = (user.role === "admin" && (!workspaceId || workspaceId === "all") && (!role || role === "admin" || role === "ceo"))
    ? await User.find(executiveFilter).lean() as any[]
    : [];

  const memberUserIds = new Set(members.map(m => String(m.userId?._id || m.userId)));

  // Flatten the member and user data for the frontend
  const users = members.map(m => {
    const u = m.userId || {};
    return {
      _id: u._id,
      memberId: m._id,
      name: u.name,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      phone: u.phone,
      avatarUrl: u.avatarUrl,
      empID: m.empID,
      role: m.role || u.role,
      roleTypes: m.roleTypes || [],
      teamName: m.departments?.[0]?.name || null,
      teamNames: m.departments?.map((d: any) => d.name) || [],
      departments: m.departments || [],
      managerName: m.managerName || "",
      status: m.status || "active",
      isActive: m.isActive
    };
  });

  for (const execUser of executiveUsers) {
    if (!memberUserIds.has(String(execUser._id))) {
      users.push({
        _id: execUser._id,
        memberId: execUser._id,
        name: execUser.name,
        firstName: execUser.firstName || "",
        lastName: execUser.lastName || "",
        email: execUser.email,
        phone: execUser.phone || "",
        avatarUrl: execUser.avatarUrl || "",
        empID: "EXEC",
        role: execUser.role || "admin",
        roleTypes: [],
        teamName: null,
        teamNames: [],
        departments: [],
        managerName: "",
        status: "active",
        isActive: true
      });
    }
  }

  const sortedUsers = sortUsersForDirectory(users);
  const usersWithDisplayTeam = sortedUsers.map((currentUser: any) => ({
    ...currentUser,
    displayTeamName: getUserTeamLabel(currentUser, teamTypeShowNameMap)
  }));

  return ApiResponse.success(usersWithDisplayTeam, "Users directory fetched successfully");
}

export async function POST(request: Request) {
  const auth = await authorizeApi(["admin", "ceo"]);
  if (!auth.authorized) return auth.response;
  const user = auth.user;

  const body = await request.json();
  const parsed = adminCreateUserSchema.safeParse(body);
  if (!parsed.success) {
    return ApiResponse.validationError("Invalid user payload", parsed.error.format());
  }

  await connectToDatabase();
  const validTeamNames = await getActiveTeamTypeNames();
  const existingUser = await User.findOne({ email: parsed.data.email.toLowerCase() }).lean();
  if (existingUser) {
    return ApiResponse.error("A user with this email already exists", 2002, 409);
  }

  const existingPhone = await User.findOne({ phone: parsed.data.phone }).lean();
  if (existingPhone) {
    return ApiResponse.error("A user with this phone number already exists", 2003, 409);
  }

  let allowedTeamNames = validTeamNames;
  if (parsed.data.role === "team_member" && parsed.data.managerName) {
    const managerUser = await User.findOne({ name: parsed.data.managerName }).lean();
    if (managerUser) {
      const managerMember = await WorkspaceMember.findOne({
        userId: (managerUser as any)._id,
        role: { $in: ["team_lead", "report_manager", "hod", "admin"] }
      }).lean() as any;
      if (managerMember?.departments?.length) {
        const deptNames = managerMember.departments.map((d: any) => d.name);
        const deptTeams = await TeamType.find({ department: { $in: deptNames }, isActive: true, isDeleted: false }).lean();
        allowedTeamNames = deptTeams.map((t: any) => t.name);
      }
    }
  }

  if (parsed.data.role === "team_member" && allowedTeamNames.length === 0) {
    return ApiResponse.validationError("Selected team lead has no assigned teams or departments");
  }

  const invalidTeamName = parsed.data.teamNames.find((teamName) => !validTeamNames.includes(teamName));
  if (invalidTeamName) {
    return ApiResponse.validationError(`Unknown team type: ${invalidTeamName}`);
  }

  const invalidLeadTeamName = parsed.data.role === "team_member" ? parsed.data.teamNames.find((teamName) => !allowedTeamNames.includes(teamName)) : null;
  if (invalidLeadTeamName) {
    return ApiResponse.validationError(`Selected team is not managed by the chosen team lead: ${invalidLeadTeamName}`);
  }

  const password = await hashPassword(parsed.data.password);
  const fullName = `${parsed.data.firstName} ${parsed.data.lastName}`.trim();
  
  if (parsed.data.role === "admin" && user.role !== "admin") {
    return ApiResponse.forbidden("Only Administrators can create an Admin account.");
  }

  if (parsed.data.role === "ceo" && user.role !== "admin") {
    return ApiResponse.forbidden("Only Administrators can create a CEO account.");
  }

  // Enforce workspace-level scoping for CEO users
  if (user.role === "ceo" && parsed.data.role !== "ceo" && parsed.data.workspaceId) {
    const hasMembership = await WorkspaceMember.findOne({
      userId: user.id,
      workspaceId: parsed.data.workspaceId,
      status: "active",
      isActive: true
    }).lean();
    if (!hasMembership) {
      return ApiResponse.forbidden("You do not have access to manage this workspace.");
    }
  }

  const isExecutive = parsed.data.role === "admin" || parsed.data.role === "ceo";

  // 1. Create global User
  const newUser = await User.create({
    name: fullName,
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    phone: parsed.data.phone,
    email: parsed.data.email.toLowerCase(),
    password,
    role: parsed.data.role,
    isDeleted: false,
    isAdminActive: isExecutive,
    isEmailActivated: false
  });

  let targetWorkspaceId = parsed.data.workspaceId;

  // Auto-create workspace for CEO
  if (parsed.data.role === "ceo") {
    const { default: Workspace } = await import("@/models/Workspace");
    const workspaceName = `${fullName} CEO Workspace`.trim();
    const newWorkspace = await Workspace.create({
      name: workspaceName,
      type: "ceo",
      isActive: true,
      createdBy: user.id
    });
    targetWorkspaceId = newWorkspace._id.toString();
  }

  // 2. Create WorkspaceMember if workspaceId is provided or auto-created
  if (targetWorkspaceId && targetWorkspaceId.trim() !== "") {
    const newMember = await WorkspaceMember.create({
      userId: newUser._id,
      workspaceId: targetWorkspaceId,
      empID: parsed.data.empID || "EMP",
      role: parsed.data.role,
      roleTypes: parsed.data.roleTypes ?? [],
      departments: parsed.data.departments ?? [],
      managerName: parsed.data.managerName ?? "",
      status: "active",
      isActive: true
    });

    return ApiResponse.created({ ...newUser.toObject(), ...newMember.toObject() }, "User created successfully");
  }

  return ApiResponse.created(newUser.toObject(), "User created successfully");
}
