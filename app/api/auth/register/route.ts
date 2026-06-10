import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { signupSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/auth";
import User from "@/models/User";
import { ensureDefaultAdmin } from "@/lib/bootstrap";
import { normalizeRole } from "@/lib/constants";
import { getActiveTeamTypeNames } from "@/lib/team-types";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid registration payload" }, { status: 400 });
  }

  await ensureDefaultAdmin();
  await connectToDatabase();
  const validTeamNames = await getActiveTeamTypeNames();
  const existing = await User.findOne({ email: parsed.data.email.toLowerCase() });
  if (existing) {
    return NextResponse.json({ success: false, message: "Email already exists" }, { status: 409 });
  }

  const password = await hashPassword(parsed.data.password);
  const defaultTeamName = validTeamNames[0] ?? "Backend";
  const user = await User.create({
    ...parsed.data,
    email: parsed.data.email.toLowerCase(),
    password,
    role: "team_member",
    teamName: defaultTeamName
  });

  return NextResponse.json({
    success: true,
    data: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: normalizeRole(user.role) ?? "team_member",
      teamName: user.teamName,
      status: user.status
    }
  });
}
