import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { signupSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/auth";
import User from "@/models/User";
import { ensureDefaultAdmin } from "@/lib/bootstrap";
import Workspace from "@/models/Workspace";
import WorkspaceMember from "@/models/WorkspaceMember";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid registration payload" }, { status: 400 });
  }

  await ensureDefaultAdmin();
  await connectToDatabase();
  const existing = await User.findOne({ email: parsed.data.email.toLowerCase() });
  if (existing) {
    return NextResponse.json({ success: false, message: "Email already exists" }, { status: 409 });
  }

  const defaultWorkspace = await Workspace.findOne({ isDeleted: { $ne: true } }).sort({ createdAt: 1 });

  const password = await hashPassword(parsed.data.password);
  const user = await User.create({
    name: parsed.data.name,
    email: parsed.data.email.toLowerCase(),
    password,
    isDeleted: false,
    isActive: true
  });

  if (defaultWorkspace) {
    await WorkspaceMember.create({
      userId: user._id,
      workspaceId: defaultWorkspace._id,
      role: "team_member",
      status: "active",
      isActive: true,
      departments: [{ name: "Software", subTeams: [] }]
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: "team_member",
      status: "active"
    }
  });
}
