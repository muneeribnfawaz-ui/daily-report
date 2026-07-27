import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import User from "@/models/User";
import { adminCreateUserSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/auth";
import { getActiveTeamTypeNames, getActiveTeamTypeShowNameMap } from "@/lib/team-types";
import { getUserTeamLabel, sortUsersForDirectory } from "@/lib/user-directory-sort";

function normalizeTeamNames(teamName?: string | null, teamNames?: string[] | null) {
  const values = [teamName, ...(teamNames ?? [])]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set(values));
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "ceo")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim();
  const role = url.searchParams.get("role");
  const status = url.searchParams.get("status");

  await connectToDatabase();
  const teamTypeShowNameMap = await getActiveTeamTypeShowNameMap();

  const filter: Record<string, unknown> = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { firstName: { $regex: search, $options: "i" } },
      { lastName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { empID: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { teamName: { $regex: search, $options: "i" } },
      { teamNames: { $regex: search, $options: "i" } },
      { managerName: { $regex: search, $options: "i" } },
      { roleTypes: { $regex: search, $options: "i" } }
    ];
  }

  const users = sortUsersForDirectory(await User.find(filter).sort({ createdAt: -1 }).lean());
  const usersWithDisplayTeam = users.map((currentUser) => ({
    ...currentUser,
    displayTeamName: getUserTeamLabel(currentUser, teamTypeShowNameMap)
  }));

  return NextResponse.json({ success: true, data: usersWithDisplayTeam });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "ceo")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = adminCreateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid user payload" }, { status: 400 });
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

  const selectedManager =
    parsed.data.role === "team_member" && parsed.data.managerName
      ? await User.findOne({ name: parsed.data.managerName, role: "team_lead" }).lean<{ teamName?: string | null; teamNames?: string[] | null }>()
      : null;

  const allowedTeamNames =
    parsed.data.role === "team_member"
      ? normalizeTeamNames(selectedManager?.teamName ?? null, selectedManager?.teamNames ?? null)
      : validTeamNames;

  if (parsed.data.role === "team_member" && allowedTeamNames.length === 0) {
    return NextResponse.json({ success: false, message: "Selected team lead has no assigned teams" }, { status: 400 });
  }

  const invalidTeamName = parsed.data.teamNames.find((teamName) => !validTeamNames.includes(teamName));
  if (invalidTeamName) {
    return NextResponse.json({ success: false, message: `Unknown team type: ${invalidTeamName}` }, { status: 400 });
  }

  const invalidLeadTeamName = parsed.data.role === "team_member" ? parsed.data.teamNames.find((teamName) => !allowedTeamNames.includes(teamName)) : null;
  if (invalidLeadTeamName) {
    return NextResponse.json({ success: false, message: `Selected team is not managed by the chosen team lead: ${invalidLeadTeamName}` }, { status: 400 });
  }

  const password = await hashPassword(parsed.data.password);
  const fullName = `${parsed.data.firstName} ${parsed.data.lastName}`.trim();
  const primaryTeam = parsed.data.teamNames[0] ?? "";
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
    teamName: primaryTeam,
    teamNames: parsed.data.teamNames,
    departments: parsed.data.departments ?? [],
    managerName: parsed.data.managerName ?? "",
    status: "active",
    isActive: true,
    isDeleted: false,
    isAdminActive: parsed.data.role === "admin" || parsed.data.role === "ceo",
    isEmailActivated: false
  });

  return NextResponse.json({ success: true, data: newUser }, { status: 201 });
}
