import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { workspaceSchema } from "@/lib/validation";
import { ApiResponse } from "@/lib/api-response";
import { authorizeApi } from "@/lib/api-auth";


export async function GET(request: Request) {
  const auth = await authorizeApi(["admin", "ceo"]);
  if (!auth.authorized) return auth.response;
  const user = auth.user;

  const url = new URL(request.url);
  const ceoId = url.searchParams.get("ceoId") || url.searchParams.get("workspaceId") || request.headers.get("x-workspace-id");

  const where: any = { isDeleted: false, type: { not: "ceo" } };

  if (user.role === "ceo") {
    const memberships = await db.workspaceMember.findMany({
      where: {
        userId: user.id,
        status: "active",
        isActive: true
      },
      include: { workspace: true }
    });
    const ceoWorkspaceIds = memberships.filter(m => m.workspace?.type === "ceo").map(m => m.workspaceId);
    const companyWorkspaceIds = memberships.filter(m => m.workspace?.type !== "ceo").map(m => m.workspaceId);
    
    where.OR = [
      { id: { in: companyWorkspaceIds } },
      { ownerWorkspaceId: { in: ceoWorkspaceIds } }
    ];
  } else if (user.role === "admin" && ceoId && ceoId !== "all" && ceoId.trim() !== "") {
    const ceoUser = await db.user.findUnique({ where: { id: ceoId } });
    if (ceoUser && ceoUser.role === "ceo") {
      const memberships = await db.workspaceMember.findMany({
        where: {
          userId: ceoId,
          status: "active",
          isActive: true
        },
        select: { workspaceId: true }
      });
      const workspaceIds = memberships.map((m) => m.workspaceId);
      where.id = { in: workspaceIds };
    } else {
      where.id = ceoId;
    }
  }

  const workspaces = await db.workspace.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { companyDetails: true }
  });

  // Flatten the response so the frontend receives it smoothly without changing existing UI right now
  const mappedWorkspaces = workspaces.map((ws) => ({
    ...ws,
    _id: ws.id,
    code: ws.companyDetails?.code || "",
    description: ws.companyDetails?.description || "",
    cin: ws.companyDetails?.cin || "",
    registrationNumber: ws.companyDetails?.registrationNumber || "",
    address: ws.companyDetails?.address || ""
  }));

  return ApiResponse.success(mappedWorkspaces, "Companies fetched successfully");
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

  
  const existingCompany = await db.company.findFirst({
    where: {
      name: { equals: parsed.data.name.trim(), mode: "insensitive" }
    }
  });

  if (existingCompany) {
    return ApiResponse.error("A company with this name already exists", 4009, 400);
  }

  const url = new URL(request.url);
  const ceoId = url.searchParams.get("ceoId") || url.searchParams.get("workspaceId") || request.headers.get("x-workspace-id");
  const targetCeoId = (ceoId && ceoId !== "all") ? ceoId : (user.role === "ceo" ? user.id : null);

  let ownerWorkspaceId: string | null = null;

  if (targetCeoId) {
    const ceoUser = await db.user.findUnique({ where: { id: targetCeoId } });
    if (ceoUser && ceoUser.role === "ceo") {
      const membership = await db.workspaceMember.findFirst({
        where: {
          userId: targetCeoId,
          status: "active",
          isActive: true,
          workspace: { type: "ceo" }
        }
      });
      if (membership) {
        ownerWorkspaceId = membership.workspaceId;
      }
    }
  }

  const finalType = parsed.data.type ?? "company";
  if (finalType === "company" && (!ownerWorkspaceId || ownerWorkspaceId.trim() === "")) {
    return ApiResponse.error("Owner workspace is mandatory for company workspaces", 4001, 400);
  }

  const newWorkspace = await db.workspace.create({
    data: {
      name: parsed.data.name.trim(),
      type: finalType,
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

  if (targetCeoId && targetCeoId !== "all") {
    const ceoUser = await db.user.findUnique({ where: { id: targetCeoId } });
    if (ceoUser && ceoUser.role === "ceo") {
      await db.workspaceMember.create({
        data: {
          userId: targetCeoId,
          workspaceId: newWorkspace.id,
          empID: "CEO",
          role: "ceo",
          status: "active",
          isActive: true
        }
      });
    }
  }

  const responseData = {
    ...newWorkspace,
    _id: newWorkspace.id,
    code: newWorkspace.companyDetails?.code || "",
    description: newWorkspace.companyDetails?.description || "",
    cin: newWorkspace.companyDetails?.cin || "",
    registrationNumber: newWorkspace.companyDetails?.registrationNumber || "",
    address: newWorkspace.companyDetails?.address || ""
  };

  return ApiResponse.created(responseData, "Company created successfully");
}
