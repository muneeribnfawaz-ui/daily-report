import { NextResponse } from "next/server";
import { getCurrentUser, getFreshSessionUser, setAuthCookie } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({ success: true, data: user });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { workspaceId } = body;

  // For executive users (admin, ceo), they can switch workspace context freely
  // For other users, they must have a WorkspaceMember record in that workspace.
  const isExecutive = user.role === "admin" || user.role === "ceo";

  if (!isExecutive) {
    const freshUser = await getFreshSessionUser({ ...user, workspaceId });
    if (!freshUser) {
      return NextResponse.json({ success: false, message: "Workspace membership not found or inactive" }, { status: 403 });
    }
    await setAuthCookie(freshUser);
    return NextResponse.json({ success: true, data: freshUser });
  } else {
    const freshUser = { ...user, workspaceId };
    await setAuthCookie(freshUser);
    return NextResponse.json({ success: true, data: freshUser });
  }
}
