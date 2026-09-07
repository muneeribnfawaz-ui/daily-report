import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { adminCreateUserSchema } from "@/lib/validation";
import { getActiveTeamTypeNames, getActiveTeamTypeShowNameMap } from "@/lib/team-types";
import { getUserTeamLabel, sortUsersForDirectory } from "@/lib/user-directory-sort";

function normalizeTeamNames(teamName?: string | null, teamNames?: string[] | null) {
  const values = [teamName, ...(teamNames ?? [])]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set(values));
}

function collectDescendantUserNames(users: Array<{ name?: string | null; managerName?: string | null }>, rootManagerName: string) {
  const descendantNames = new Set<string>();
  const queue = [rootManagerName];

  while (queue.length) {
    const currentManager = queue.shift();
    if (!currentManager) continue;

    for (const user of users) {
      if (!user.name || !user.managerName) continue;
      if (user.managerName !== currentManager || descendantNames.has(user.name)) continue;

      descendantNames.add(user.name);
      queue.push(user.name);
    }
  }

  return descendantNames;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "ceo" && user.role !== "team_lead" && user.role !== "report_manager" && user.role !== "hod")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim();
  const workspaceId = url.searchParams.get("workspaceId") || request.headers.get("x-workspace-id") || user.workspaceId;
  const department = url.searchParams.get("department") || request.headers.get("x-department");

  const teamTypeShowNameMap = await getActiveTeamTypeShowNameMap();

  const filter: Record<string, any> = { isActive: true };

  if (department && department !== "all" && department !== "All") {
    const matchingTeamTypes = await db.teamType.findMany({
      where: {
        isDeleted: false,
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
    const memberships = await db.workspaceMember.findMany({ where: { userId: user.id, status: "active", isActive: true }, select: { workspaceId: true } });
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

  const members = await db.workspaceMember.findMany({
    where: filter,
    include: { user: true, departments: true }
  });

  const validTeamNames = await getActiveTeamTypeNames();

  const allUsers = members.map((m) => {
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
      role: m.role,
      roleTypes: m.roleTypes,
      teamName: primaryTeamName,
      teamNames: filteredTeamNames,
      departments: m.departments,
      managerName: m.managerName,
      status: m.status,
      isActive: m.isActive,
      createdAt: m.createdAt
    };
  });

  const visibleUserNames =
    (user.role === "admin" || user.role === "ceo")
      ? null
      : collectDescendantUserNames(allUsers, user.name);

  let filtered = allUsers;
  if (visibleUserNames) {
    filtered = filtered.filter((u) => u.name && visibleUserNames.has(u.name));
  }

  if (search) {
    const searchRegex = new RegExp(search, "i");
    filtered = filtered.filter(
      (u) =>
        searchRegex.test(u.name || "") ||
        searchRegex.test(u.email || "") ||
        searchRegex.test(u.empID || "") ||
        searchRegex.test(u.managerName || "")
    );
  }

  const sortedUsers = sortUsersForDirectory(filtered);
  const usersWithManagerTeams = sortedUsers.map((currentUser) => ({
    ...currentUser,
    displayTeamName: getUserTeamLabel(currentUser, teamTypeShowNameMap)
  }));

  return NextResponse.json({ success: true, data: usersWithManagerTeams });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "ceo" && user.role !== "team_lead" && user.role !== "hod")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = adminCreateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid user payload" }, { status: 400 });
  }

  if (user.role === "team_lead" && parsed.data.role !== "team_member") {
    return NextResponse.json({ success: false, message: "Team leads can only create team members" }, { status: 403 });
  }

  if (user.role === "hod" && (parsed.data.role === "admin" || parsed.data.role === "ceo" || parsed.data.role === "hod")) {
    return NextResponse.json({ success: false, message: "HOD cannot create admin, CEO, or HOD users" }, { status: 403 });
  }

  const validTeamNames = await getActiveTeamTypeNames();
  const existingUser = await db.user.findFirst({ where: { email: parsed.data.email.toLowerCase() } });
  if (existingUser) {
    return NextResponse.json({ success: false, message: "A user with this email already exists" }, { status: 409 });
  }

  const existingPhone = await db.user.findFirst({ where: { phone: parsed.data.phone } });
  if (existingPhone) {
    return NextResponse.json({ success: false, message: "A user with this phone number already exists" }, { status: 409 });
  }

  const userTeamNames = normalizeTeamNames(user.teamName ?? null, user.teamNames ?? null);
  const resolvedTeamNames = parsed.data.teamNames;

  if (resolvedTeamNames.length === 0) {
    return NextResponse.json({ success: false, message: "Select at least one team" }, { status: 400 });
  }

  const invalidTeamName = resolvedTeamNames.find((teamName) => !validTeamNames.includes(teamName));
  if (invalidTeamName) {
    return NextResponse.json({ success: false, message: `Unknown team type: ${invalidTeamName}` }, { status: 400 });
  }

  if (user.role === "team_lead") {
    const userDepts = user.departments?.map((d) => d.name) ?? [];
    const submittedDepts = parsed.data.departments?.map((d) => d.name) ?? [];
    const invalidDept = submittedDepts.find((dept) => !userDepts.includes(dept));
    if (invalidDept) {
      return NextResponse.json({ success: false, message: `Team leads can only assign users to their own departments. Invalid department: ${invalidDept}` }, { status: 403 });
    }
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
        const deptTeams = await db.teamType.findMany({ where: { department: { in: deptNames }, isActive: true, isDeleted: false } });
        allowedTeamNames = deptTeams.map((t: any) => t.name);
      }
    }
  }

  if (parsed.data.role === "team_member" && allowedTeamNames.length === 0) {
    return NextResponse.json({ success: false, message: "Selected team lead has no assigned teams" }, { status: 400 });
  }

  const invalidLeadTeamName = parsed.data.role === "team_member" ? resolvedTeamNames.find((teamName) => !allowedTeamNames.includes(teamName)) : null;
  if (invalidLeadTeamName) {
    return NextResponse.json({ success: false, message: `Selected team is not managed by the chosen team lead: ${invalidLeadTeamName}` }, { status: 400 });
  }

  const password = await hashPassword(parsed.data.password);
  const fullName = `${parsed.data.firstName} ${parsed.data.lastName}`.trim();
  const nextManagerName =
    user.role === "team_lead"
      ? user.name
      : parsed.data.role === "team_member"
        ? parsed.data.managerName
        : user.name;

  const targetWorkspaceId = parsed.data.workspaceId || user.workspaceId;

  // 1. Create global User
  const newUser = await db.user.create({
    data: {
      name: fullName,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      phone: parsed.data.phone,
      email: parsed.data.email.toLowerCase(),
      password,
      isDeleted: false,
      isAdminActive: parsed.data.role === "admin" || parsed.data.role === "ceo",
      isEmailActivated: false
    }
  });

  // 2. Create WorkspaceMember
  const newMember = await db.workspaceMember.create({
    data: {
      userId: newUser.id,
      workspaceId: targetWorkspaceId,
      empID: parsed.data.empID,
      role: parsed.data.role,
      roleTypes: parsed.data.roleTypes,
      teamNames: parsed.data.teamNames,
      teamName: parsed.data.teamNames?.[0] || "",
      departments: {
        create: parsed.data.departments?.map((d: any) => ({ name: d.name, subTeams: d.subTeams })) || []
      },
      managerName: parsed.data.role === "admin" || parsed.data.role === "ceo" ? "" : nextManagerName ?? "",
      status: "active",
      isActive: true
    },
    include: { departments: true }
  });

  return NextResponse.json({ success: true, data: { ...newUser, ...newMember } }, { status: 201 });
}
