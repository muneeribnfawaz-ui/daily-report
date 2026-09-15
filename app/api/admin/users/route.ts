import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { adminCreateUserSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/auth";
import { getActiveTeamTypeNames, getActiveTeamTypeShowNameMap } from "@/lib/team-types";
import { getUserTeamLabel, sortUsersForDirectory } from "@/lib/user-directory-sort";
import { ApiResponse } from "@/lib/api-response";
import { authorizeApi } from "@/lib/api-auth";
import { normalizeEmpId } from "@/lib/utils";


function normalizeTeamNames(teamName?: string | null, teamNames?: string[] | null) {
  const values = [teamName, ...(teamNames ?? [])]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set(values));
}

export async function GET(request: Request) {
  const auth = await authorizeApi(["admin", "ceo", "hod", "report_manager", "team_lead"]);
  if (!auth.authorized) return auth.response;
  const user = auth.user;

  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim();
  const role = url.searchParams.get("role");
  const status = url.searchParams.get("status");
  const department = url.searchParams.get("department");
  let workspaceId = url.searchParams.get("workspaceId") || request.headers.get("x-workspace-id");
  if (!workspaceId && user.role !== "admin" && role !== "ceo") {
    workspaceId = user.workspaceId;
  }
  if (!workspaceId && user.role !== "admin" && role !== "ceo") {
    return ApiResponse.validationError("workspaceId is required");
  }

    const teamTypeShowNameMap = await getActiveTeamTypeShowNameMap(workspaceId || undefined);

  const filter: Record<string, any> = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (department && department !== "all" && department !== "All") {
    const matchingTeamTypes = await db.teamType.findMany({
      where: {
        isDeleted: false,
        ...(workspaceId && workspaceId !== "all" ? { workspaceId } : {}),
        OR: [
          { name: department },
          { showName: department },
          { department: department },
          { name: { equals: department, mode: "insensitive" } },
          { showName: { equals: department, mode: "insensitive" } }
        ]
      },
      select: { name: true, showName: true }
    });

    const matchedNames = new Set<string>([department]);
    for (const tt of matchingTeamTypes) {
      if (tt.name) matchedNames.add(tt.name);
      if (tt.showName) matchedNames.add(tt.showName);
    }
    const matchedNamesList = Array.from(matchedNames);

    filter.OR = [
      { teamName: { in: matchedNamesList } },
      { teamNames: { hasSome: matchedNamesList } },
      { departments: { some: { name: { equals: department, mode: "insensitive" } } } }
    ];
  }

  if (user.role !== "admin") {
    const memberships = await db.workspaceMember.findMany({
      where: {
        userId: user.id,
        status: "active",
        isActive: true
      },
      select: { workspaceId: true }
    });
    const allowedWorkspaceIds = memberships.map(m => String(m.workspaceId));

    if (workspaceId && workspaceId !== "all") {
      filter.workspaceId = allowedWorkspaceIds.includes(workspaceId) ? workspaceId : "non_existent_id";
    } else {
      filter.workspaceId = { in: allowedWorkspaceIds };
    }
  } else {
    if (workspaceId && workspaceId !== "all") {
      filter.workspaceId = workspaceId;
    }
  }

  // We find WorkspaceMembers and include the User document
  const members = await db.workspaceMember.findMany({
    where: filter,
    include: { user: true, departments: true },
    orderBy: { createdAt: 'desc' }
  });

  // Fetch global executive users (admin, ceo) who do not have WorkspaceMember records
  // Only display them for Admin users, since CEO only sees their own workspace items.
  const executiveFilter: Record<string, unknown> = {
    role: { in: ["admin", "ceo"] },
    isDeleted: false
  };
  if (role && (role === "admin" || role === "ceo")) {
    executiveFilter.role = role;
  }
  const executiveUsers = (user.role === "admin" && (!workspaceId || workspaceId === "all") && (!role || role === "admin" || role === "ceo"))
    ? await db.user.findMany({ where: executiveFilter })
    : [];

  const memberUserIds = new Set(members.map(m => String(m.userId)));

  const validTeamNames = await getActiveTeamTypeNames(workspaceId || undefined);

  // Flatten the member and user data for the frontend
  const users = members.map(m => {
    const u = m.user || ({} as any);
    const filteredTeamNames = (m.teamNames || []).filter((name) => validTeamNames.includes(name));
    const primaryTeamName = validTeamNames.includes(m.teamName) ? m.teamName : (filteredTeamNames[0] || null);

    return {
      _id: u.id,
      memberId: m.id,
      name: u.name,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      phone: u.phone,
      avatarUrl: u.avatarUrl,
      empID: m.empID,
      role: m.role || u.role,
      roleTypes: m.roleTypes || [],
      teamName: primaryTeamName,
      teamNames: filteredTeamNames,
      departments: m.departments || [],
      managerName: m.managerName || "",
      status: m.status || "active",
      isActive: m.isActive
    };
  });

  for (const execUser of executiveUsers) {
    if (!memberUserIds.has(String(execUser.id))) {
      users.push({
        _id: execUser.id,
        memberId: execUser.id,
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
  const auth = await authorizeApi(["admin", "ceo", "hod", "report_manager", "team_lead"]);
  if (!auth.authorized) return auth.response;
  const user = auth.user;

  const body = await request.json();
  const parsed = adminCreateUserSchema.safeParse(body);
  if (!parsed.success) {
    return ApiResponse.validationError("Invalid user payload", parsed.error.format());
  }

  let targetWorkspaceId = parsed.data.workspaceId;
  if (!targetWorkspaceId && user.role !== "admin" && user.role !== "ceo") {
    targetWorkspaceId = user.workspaceId;
  }

  const validTeamNames = await getActiveTeamTypeNames(targetWorkspaceId || undefined);
  const existingUser = await db.user.findFirst({ where: { email: parsed.data.email.toLowerCase() } });
  if (existingUser) {
    return ApiResponse.error("A user with this email already exists", 2002, 409);
  }

  const existingPhone = await db.user.findFirst({ where: { phone: parsed.data.phone } });
  if (existingPhone) {
    return ApiResponse.error("A user with this phone number already exists", 2003, 409);
  }

  let allowedTeamNames = validTeamNames;
  if (parsed.data.role === "team_member" && parsed.data.managerName) {
    const managerUser = await db.user.findFirst({ where: { name: parsed.data.managerName } });
    if (managerUser) {
      const managerMember = await db.workspaceMember.findFirst({
        where: {
          userId: managerUser.id,
          role: { in: ["team_lead", "report_manager", "hod", "admin"] }
        },
        include: { departments: true }
      });
      if (managerMember?.departments?.length) {
        const deptNames = managerMember.departments.map((d: any) => d.name);
        const deptTeams = await db.teamType.findMany({ 
          where: {
            department: { in: deptNames },
            isActive: true,
            isDeleted: false,
            ...(targetWorkspaceId ? { workspaceId: targetWorkspaceId } : {})
          }
        });
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
  
  const roleHierarchy: Record<string, number> = {
    "admin": 100,
    "ceo": 90,
    "hod": 80,
    "report_manager": 70,
    "team_lead": 60,
    "team_member": 50
  };

  const creatorRank = roleHierarchy[user.role] || 0;
  const targetRank = roleHierarchy[parsed.data.role] || 0;

  if (creatorRank <= targetRank && user.role !== "admin") {
    return ApiResponse.forbidden(`Your role (${user.role}) is not authorized to create a ${parsed.data.role} account.`);
  }

  // Enforce workspace-level scoping for CEO users
  if (user.role === "ceo" && parsed.data.role !== "ceo" && parsed.data.workspaceId) {
    const hasMembership = await db.workspaceMember.findFirst({
      where: {
        userId: user.id,
        workspaceId: parsed.data.workspaceId,
        status: "active",
        isActive: true
      }
    });
    if (!hasMembership) {
      return ApiResponse.forbidden("You do not have access to manage this workspace.");
    }
  }

  const rawEmpId = parsed.data.empID ? parsed.data.empID.trim() : "";
  const normalizedEmpId = normalizeEmpId(rawEmpId);

  if (!targetWorkspaceId && user.role !== "admin" && user.role !== "ceo") {
    targetWorkspaceId = user.workspaceId;
  }

  if (targetWorkspaceId && normalizedEmpId) {
    const existingMember = await (db.workspaceMember as any).findFirst({
      where: {
        workspaceId: targetWorkspaceId,
        OR: [
          { empIDNormalized: normalizedEmpId },
          { empID: { equals: rawEmpId, mode: "insensitive" } }
        ]
      }
    });
    if (existingMember) {
      return ApiResponse.error("Employee ID already exists. Please enter a unique Employee ID.", 2004, 409);
    }
  }

  const isExecutive = parsed.data.role === "admin" || parsed.data.role === "ceo";

  // 1. Create global User
  const newUser = await db.user.create({
    data: {
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
    }
  });

  // Auto-create workspace for CEO
  if (parsed.data.role === "ceo") {
    const workspaceName = `${fullName} CEO Workspace`.trim();
    const newWorkspace = await db.workspace.create({
      data: {
        name: workspaceName,
        type: "ceo",
        isActive: true,
        createdBy: user.id
      }
    });
    targetWorkspaceId = newWorkspace.id;
  }

  const resolvedManagerName =
    user.role === "team_lead"
      ? user.name
      : user.role === "hod" && (parsed.data.role === "team_lead" || parsed.data.role === "report_manager")
        ? user.name
        : user.role === "report_manager" && parsed.data.role === "team_lead"
          ? user.name
          : parsed.data.role === "admin" || parsed.data.role === "ceo"
            ? ""
            : parsed.data.managerName ?? "";

  // 2. Create WorkspaceMember if workspaceId is provided or auto-created
  if (targetWorkspaceId && targetWorkspaceId.trim() !== "") {
    try {
      const newMember = await (db.workspaceMember as any).create({
        data: {
          userId: newUser.id,
          workspaceId: targetWorkspaceId,
          empID: rawEmpId || (isExecutive ? (parsed.data.role === "ceo" ? "CEO" : "EXEC") : "EMP"),
          empIDNormalized: normalizedEmpId || (isExecutive ? (parsed.data.role === "ceo" ? "ceo" : "exec") : "emp"),
          role: parsed.data.role,
          roleTypes: parsed.data.roleTypes ?? [],
          teamNames: parsed.data.teamNames ?? [],
          teamName: parsed.data.teamNames?.[0] || "",
          departments: {
            create: parsed.data.departments?.map((d: any) => ({ name: d.name, subTeams: d.subTeams })) || []
          },
          managerName: resolvedManagerName,
          status: "active",
          isActive: true
        },
        include: { departments: true }
      });

      return ApiResponse.created({ ...newUser, ...newMember }, "User created successfully");
    } catch (dbError: any) {
      await db.user.delete({ where: { id: newUser.id } }).catch(() => {});
      if (dbError?.code === "P2002" || String(dbError?.message).includes("empID") || String(dbError?.message).includes("Unique constraint")) {
        return ApiResponse.error("Employee ID already exists. Please enter a unique Employee ID.", 2004, 409);
      }
      throw dbError;
    }
  }

  return ApiResponse.created(newUser, "User created successfully");
}
