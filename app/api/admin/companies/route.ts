import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import Workspace from "@/models/Workspace";
import { workspaceSchema } from "@/lib/validation";
import { ApiResponse } from "@/lib/api-response";
import { authorizeApi } from "@/lib/api-auth";

import User from "@/models/User";
import WorkspaceMember from "@/models/WorkspaceMember";

export async function GET(request: Request) {
  const auth = await authorizeApi(["admin", "ceo"]);
  if (!auth.authorized) return auth.response;
  const user = auth.user;

  const url = new URL(request.url);
  const ceoId = url.searchParams.get("ceoId") || url.searchParams.get("workspaceId") || request.headers.get("x-workspace-id");

  await connectToDatabase();
  const filter: any = { isDeleted: { $ne: true }, type: { $ne: "ceo" } };

  if (user.role === "ceo") {
    const memberships = await WorkspaceMember.find({
      userId: user.id,
      status: "active",
      isActive: true
    }).select("workspaceId").lean() as any[];
    const workspaceIds = memberships.map((m) => m.workspaceId);
    filter._id = { $in: workspaceIds };
  } else if (user.role === "admin" && ceoId && ceoId !== "all" && ceoId.trim() !== "") {
    const ceoUser = await User.findById(ceoId).lean() as any;
    if (ceoUser && ceoUser.role === "ceo") {
      const memberships = await WorkspaceMember.find({
        userId: ceoId,
        status: "active",
        isActive: true
      }).select("workspaceId").lean() as any[];
      const workspaceIds = memberships.map((m) => m.workspaceId);
      filter._id = { $in: workspaceIds };
    } else {
      filter._id = ceoId;
    }
  }

  const workspaces = await Workspace.find(filter)
    .sort({ createdAt: -1 })
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

  const url = new URL(request.url);
  const ceoId = url.searchParams.get("ceoId") || url.searchParams.get("workspaceId") || request.headers.get("x-workspace-id");

  const newWorkspace = await Workspace.create({
    name: parsed.data.name.trim(),
    code: parsed.data.code ? parsed.data.code.trim().toUpperCase() : "",
    type: parsed.data.type ?? "company",
    description: parsed.data.description ? parsed.data.description.trim() : "",
    isActive: parsed.data.isActive ?? true,
    createdBy: user.name || user.email
  });

  const targetCeoId = ceoId || (user.role === "ceo" ? user.id : null);
  if (targetCeoId && targetCeoId !== "all") {
    const ceoUser = await User.findById(targetCeoId).lean() as any;
    if (ceoUser && ceoUser.role === "ceo") {
      await WorkspaceMember.create({
        userId: targetCeoId,
        workspaceId: newWorkspace._id,
        empID: "CEO",
        role: "ceo",
        status: "active",
        isActive: true
      });
    }
  }

  return ApiResponse.created(newWorkspace, "Company created successfully");
}
