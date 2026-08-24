import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import Workspace from "@/models/Workspace";
import { workspaceSchema } from "@/lib/validation";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "ceo")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json();
  const parsed = workspaceSchema.partial().safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Invalid payload", errors: parsed.error.format() },
      { status: 400 }
    );
  }

  await connectToDatabase();
  const workspace = await Workspace.findById(id);

  if (!workspace || workspace.isDeleted) {
    return NextResponse.json({ success: false, message: "Workspace not found" }, { status: 404 });
  }

  if (parsed.data.name && parsed.data.name.trim().toLowerCase() !== workspace.name.toLowerCase()) {
    const existing = await Workspace.findOne({
      _id: { $ne: id },
      name: { $regex: new RegExp(`^${parsed.data.name.trim()}$`, "i") },
      isDeleted: { $ne: true }
    });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "A workspace with this name already exists" },
        { status: 400 }
      );
    }
    workspace.name = parsed.data.name.trim();
  }

  if (parsed.data.code !== undefined) workspace.code = parsed.data.code.trim().toUpperCase();
  if (parsed.data.type !== undefined) workspace.type = parsed.data.type;
  if (parsed.data.description !== undefined) workspace.description = parsed.data.description.trim();
  if (parsed.data.isActive !== undefined) workspace.isActive = parsed.data.isActive;

  await workspace.save();

  return NextResponse.json({
    success: true,
    message: "Workspace updated successfully",
    data: workspace
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "ceo")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  await connectToDatabase();

  const workspace = await Workspace.findById(id);
  if (!workspace || workspace.isDeleted) {
    return NextResponse.json({ success: false, message: "Workspace not found" }, { status: 404 });
  }

  workspace.isDeleted = true;
  await workspace.save();

  return NextResponse.json({
    success: true,
    message: "Workspace deleted successfully"
  });
}
