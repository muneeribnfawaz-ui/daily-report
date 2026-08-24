import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { loginSchema } from "@/lib/validation";
import { verifyPassword, setAuthCookie } from "@/lib/auth";
import User from "@/models/User";
import WorkspaceMember from "@/models/WorkspaceMember";
import { ensureDefaultAdmin } from "@/lib/bootstrap";
import { normalizeRole } from "@/lib/constants";
import { ApiResponse } from "@/lib/api-response";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return ApiResponse.validationError("Invalid login payload", parsed.error.format());
  }

  await ensureDefaultAdmin();
  await connectToDatabase();
  const user = await User.findOne({ email: parsed.data.email.toLowerCase() });

  if (!user) {
    return ApiResponse.loginError("Invalid credentials");
  }

  if (user.isDeleted) {
    return ApiResponse.forbidden("Your account is not active");
  }

  const matches = await verifyPassword(parsed.data.password, user.password);
  if (!matches) {
    return ApiResponse.loginError("Invalid credentials");
  }

  const isExecutive = user.role === "admin" || user.role === "ceo";
  const firstMember = await WorkspaceMember.findOne({ userId: user._id, status: "active", isActive: true }).lean() as any;

  if (!firstMember && !isExecutive) {
    return ApiResponse.forbidden("You are not assigned to any active workspace.");
  }

  const role = normalizeRole(isExecutive ? user.role : firstMember?.role) ?? "team_member";
  const workspaceId = firstMember ? String(firstMember.workspaceId) : "";
  
  await setAuthCookie({
    id: String(user._id),
    name: user.name,
    email: user.email,
    workspaceId,
    role,
    teamName: firstMember?.departments?.[0]?.name || user.teamName || null,
    teamNames: firstMember?.departments?.map((d: any) => d.name) || user.teamNames || [],
    departments: firstMember?.departments || user.departments || [],
    status: user.status || "active"
  });

  return ApiResponse.loginSuccess({
    id: String(user._id),
    name: user.name,
    email: user.email,
    workspaceId,
    role,
    teamName: firstMember?.departments?.[0]?.name || user.teamName || null,
    teamNames: firstMember?.departments?.map((d: any) => d.name) || user.teamNames || [],
    departments: firstMember?.departments || user.departments || [],
    status: user.status || "active"
  });
}
