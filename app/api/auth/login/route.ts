import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { loginSchema } from "@/lib/validation";
import { verifyPassword, setAuthCookie } from "@/lib/auth";
import User from "@/models/User";
import { ensureDefaultAdmin } from "@/lib/bootstrap";
import { normalizeRole } from "@/lib/constants";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid login payload" }, { status: 400 });
  }

  await ensureDefaultAdmin();
  await connectToDatabase();
  const user = await User.findOne({ email: parsed.data.email.toLowerCase() });

  if (!user) {
    return NextResponse.json({ success: false, message: "Invalid credentials" }, { status: 401 });
  }

  if (user.status !== "active") {
    return NextResponse.json({ success: false, message: "Your account is not active" }, { status: 403 });
  }

  const matches = await verifyPassword(parsed.data.password, user.password);
  if (!matches) {
    return NextResponse.json({ success: false, message: "Invalid credentials" }, { status: 401 });
  }

  await setAuthCookie({
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: normalizeRole(user.role) ?? "team_member",
    teamName: user.teamName,
    status: user.status
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
