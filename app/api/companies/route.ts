import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import Workspace from "@/models/Workspace";
import mongoose from "mongoose";
import { workspaceSchema } from "@/lib/validation";
import { ApiResponse } from "@/lib/api-response";
import { authorizeApi } from "@/lib/api-auth";

export async function GET() {
  const auth = await authorizeApi(["authenticated"]);
  if (!auth.authorized) return auth.response;
  const user = auth.user;

  await connectToDatabase();
  let workspaceIds: string[] | null = null;

  if (user.role !== "admin") {
    const memberships = await mongoose.model("WorkspaceMember").find({
      userId: user.id,
      status: "active",
      isActive: true
    }).select("workspaceId").lean() as unknown as { workspaceId: mongoose.Types.ObjectId }[];
    
    workspaceIds = memberships.map(m => m.workspaceId.toString());
  }

  const filter: any = { isDeleted: { $ne: true }, type: { $ne: "ceo" } };
  
  if (user.role !== "admin") {
    filter.isActive = true;
    if (workspaceIds) {
      filter._id = { $in: workspaceIds };
    }
  }

  const workspaces = await Workspace.find(filter)
    .sort({ name: 1 })
    .lean();

  return ApiResponse.success(workspaces, "Companies fetched successfully");
}

export async function POST(request: Request) {
  const auth = await authorizeApi(["admin", "ceo"]);
  if (!auth.authorized) return auth.response;
  const user = auth.user;

  const body = await request.json();
  const parsed = workspaceSchema.safeParse(body);
  if (!parsed.success) {
    return ApiResponse.validationError("Invalid payload", parsed.error.format());
  }

  await connectToDatabase();

  const existing = await Workspace.findOne({
    name: { $regex: new RegExp(`^${parsed.data.name.trim()}$`, "i") },
    isDeleted: { $ne: true }
  });

  if (existing) {
    return ApiResponse.error("A workspace with this name already exists", 4009, 400);
  }

  const workspace = await Workspace.create({
    name: parsed.data.name.trim(),
    code: parsed.data.code ? parsed.data.code.trim().toUpperCase() : "",
    description: parsed.data.description ? parsed.data.description.trim() : "",
    isActive: parsed.data.isActive ?? true,
    createdBy: user.name || user.email
  });

  return ApiResponse.created(workspace, "Workspace created successfully");
}
