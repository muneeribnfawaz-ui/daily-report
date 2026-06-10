import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import User from "@/models/User";
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
  if (!user || (user.role !== "admin" && user.role !== "team_lead" && user.role !== "report_manager" && user.role !== "hod")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim();

  await connectToDatabase();
  const teamTypeShowNameMap = await getActiveTeamTypeShowNameMap();

  const allUsers = user.role === "admin" ? [] : await User.find({}).lean();
  const visibleUserNames =
    user.role === "admin"
      ? null
      : collectDescendantUserNames(allUsers as Array<{ name?: string | null; managerName?: string | null }>, user.name);

  const visibilityFilter =
    user.role === "admin"
      ? {}
      : user.role === "hod"
        ? {
            name: { $in: Array.from(visibleUserNames ?? []) }
          }
        : { name: { $in: Array.from(visibleUserNames ?? []) } };

  const searchFilter = search
    ? {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { empID: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
          { teamName: { $regex: search, $options: "i" } },
          { managerName: { $regex: search, $options: "i" } }
        ]
      }
    : null;

  const filter =
    user.role === "admin"
      ? searchFilter ?? {}
      : searchFilter
        ? { $and: [visibilityFilter, searchFilter] }
        : visibilityFilter;

  const users = sortUsersForDirectory(await User.find(filter).sort({ createdAt: -1 }).lean());

  const usersWithManagerTeams = users.map((currentUser) => ({
    ...currentUser,
    displayTeamName: getUserTeamLabel(currentUser, teamTypeShowNameMap)
  }));

  return NextResponse.json({ success: true, data: usersWithManagerTeams });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "team_lead" && user.role !== "hod")) {
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

  if (user.role === "hod" && (parsed.data.role === "admin" || parsed.data.role === "hod")) {
    return NextResponse.json({ success: false, message: "HOD cannot create admin or HOD users" }, { status: 403 });
  }

  await connectToDatabase();
  const validTeamNames = await getActiveTeamTypeNames();
  const existingUser = await User.findOne({ email: parsed.data.email.toLowerCase() }).lean();
  if (existingUser) {
    return NextResponse.json({ success: false, message: "A user with this email already exists" }, { status: 409 });
  }

  const existingPhone = await User.findOne({ phone: parsed.data.phone }).lean();
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

  const invalidTeamLeadTeamName =
    user.role === "team_lead" ? resolvedTeamNames.find((teamName) => !userTeamNames.includes(teamName)) : null;
  if (invalidTeamLeadTeamName) {
    return NextResponse.json({ success: false, message: `Team leads can only assign users to their selected team: ${invalidTeamLeadTeamName}` }, { status: 403 });
  }

  const selectedManager =
    user.role === "team_lead"
      ? { teamName: user.teamName, teamNames: user.teamNames }
      : parsed.data.role === "team_member" && parsed.data.managerName
        ? await User.findOne({ name: parsed.data.managerName, role: "team_lead" }).lean<{ teamName?: string | null; teamNames?: string[] | null }>()
        : null;

  const allowedTeamNames =
    parsed.data.role === "team_member"
      ? normalizeTeamNames(selectedManager?.teamName ?? null, selectedManager?.teamNames ?? null)
      : validTeamNames;

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
  const newUser = await User.create({
    name: fullName,
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    phone: parsed.data.phone,
    empID: parsed.data.empID,
    email: parsed.data.email.toLowerCase(),
    password,
    role: parsed.data.role,
    roleTypes: parsed.data.roleTypes,
    teamName: resolvedTeamNames[0] ?? "",
    teamNames: resolvedTeamNames,
    managerName: nextManagerName ?? "",
    status: "active",
    isActive: true,
    isDeleted: false,
    isAdminActive: parsed.data.role === "admin",
    isEmailActivated: false
  });

  return NextResponse.json({ success: true, data: newUser }, { status: 201 });
}
