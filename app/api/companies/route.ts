import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { workspaceSchema } from "@/lib/validation";
import { ApiResponse } from "@/lib/api-response";
import { authorizeApi } from "@/lib/api-auth";

export async function GET() {
  const auth = await authorizeApi(["authenticated"]);
  if (!auth.authorized) return auth.response;
  const user = auth.user;

    let workspaceIds: string[] | null = null;

  if (user.role !== "admin") {
    const memberships = await db.workspaceMember.findMany({
      where: {
        userId: user.id,
        status: "active",
        isActive: true
      },
      select: { workspaceId: true }
    });
    
    workspaceIds = memberships.map(m => m.workspaceId);
  }

  const where: any = { isDeleted: false, type: { not: "ceo" } };
  
  if (user.role !== "admin") {
    where.isActive = true;
    if (workspaceIds) {
      where.id = { in: workspaceIds };
    }
  }

  const workspaces = await db.workspace.findMany({
    where,
    include: { companyDetails: true }
  });

  const sortedWorkspaces = workspaces
    .map(ws => ({
      ...ws,
      _id: ws.id,
      code: ws.companyDetails?.code || "",
      description: ws.companyDetails?.description || "",
      cin: ws.companyDetails?.cin || "",
      registrationNumber: ws.companyDetails?.registrationNumber || "",
      address: ws.companyDetails?.address || ""
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return ApiResponse.success(sortedWorkspaces, "Companies fetched successfully");
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

  
  const existing = await db.company.findFirst({
    where: {
      name: { equals: parsed.data.name.trim(), mode: "insensitive" }
    }
  });

  if (existing) {
    return ApiResponse.error("A company with this name already exists", 4009, 400);
  }

  let ownerWorkspaceId: string | null = null;
  const membership = await db.workspaceMember.findFirst({
    where: {
      userId: user.id,
      status: "active",
      isActive: true,
      workspace: { type: "ceo" }
    }
  });
  if (membership) {
    ownerWorkspaceId = membership.workspaceId;
  }

  if (!ownerWorkspaceId) {
    return ApiResponse.error("Owner workspace is mandatory for company workspaces", 4001, 400);
  }

  const workspace = await db.workspace.create({
    data: {
      name: parsed.data.name.trim(),
      type: "company",
      ownerWorkspaceId: ownerWorkspaceId,
      isActive: parsed.data.isActive ?? true,
      createdBy: user.name || user.email,
      companyDetails: {
        create: {
          name: parsed.data.name.trim(),
          code: parsed.data.code ? parsed.data.code.trim().toUpperCase() : "",
          description: parsed.data.description ? parsed.data.description.trim() : "",
          cin: parsed.data.cin,
          registrationNumber: parsed.data.registrationNumber,
          address: parsed.data.address
        }
      }
    },
    include: { companyDetails: true }
  });

  const responseData = {
    ...workspace,
    _id: workspace.id,
    code: workspace.companyDetails?.code || "",
    description: workspace.companyDetails?.description || "",
    cin: workspace.companyDetails?.cin || "",
    registrationNumber: workspace.companyDetails?.registrationNumber || "",
    address: workspace.companyDetails?.address || ""
  };

  return ApiResponse.created(responseData, "Workspace created successfully");
}
