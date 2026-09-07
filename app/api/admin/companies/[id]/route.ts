import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { workspaceUpdateSchema } from "@/lib/validation";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "ceo")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;

  const workspace = await db.workspace.findUnique({
    where: { id },
    include: { companyDetails: true }
  });

  if (!workspace || workspace.isDeleted) {
    return NextResponse.json({ success: false, message: "Workspace not found" }, { status: 404 });
  }

  const responseData = {
    ...workspace,
    _id: workspace.id,
    code: workspace.companyDetails?.code || "",
    description: workspace.companyDetails?.description || "",
    cin: workspace.companyDetails?.cin || "",
    registrationNumber: workspace.companyDetails?.registrationNumber || "",
    address: workspace.companyDetails?.address || ""
  };

  return NextResponse.json({
    success: true,
    message: "Workspace fetched successfully",
    data: responseData
  });
}

export async function PUT(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "ceo")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json();
  const parsed = workspaceUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Invalid payload", errors: parsed.error.format() },
      { status: 400 }
    );
  }

  const workspace = await db.workspace.findUnique({
    where: { id },
    include: { companyDetails: true }
  });

  if (!workspace || workspace.isDeleted) {
    return NextResponse.json({ success: false, message: "Workspace not found" }, { status: 404 });
  }

  const updateData: any = {};
  const companyUpdateData: any = {};

  if (parsed.data.name && parsed.data.name.trim().toLowerCase() !== workspace.companyDetails?.name?.toLowerCase()) {
    const existingCompany = await db.company.findFirst({
      where: {
        workspaceId: { not: id },
        name: { equals: parsed.data.name.trim(), mode: "insensitive" }
      }
    });
    if (existingCompany) {
      return NextResponse.json(
        { success: false, message: "A company with this name already exists" },
        { status: 400 }
      );
    }
    companyUpdateData.name = parsed.data.name.trim();
    updateData.name = parsed.data.name.trim();
  }

  if (parsed.data.code !== undefined) companyUpdateData.code = parsed.data.code.trim().toUpperCase();
  if (parsed.data.description !== undefined) companyUpdateData.description = parsed.data.description.trim();
  if (parsed.data.cin !== undefined) companyUpdateData.cin = parsed.data.cin;
  if (parsed.data.registrationNumber !== undefined) companyUpdateData.registrationNumber = parsed.data.registrationNumber;
  if (parsed.data.address !== undefined) companyUpdateData.address = parsed.data.address;

  if (parsed.data.type !== undefined) updateData.type = parsed.data.type;
  if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive;
  if (parsed.data.ownerWorkspaceId !== undefined) updateData.ownerWorkspaceId = parsed.data.ownerWorkspaceId;

  const finalType = parsed.data.type !== undefined ? parsed.data.type : workspace.type;
  const finalOwnerWorkspaceId = parsed.data.ownerWorkspaceId !== undefined ? parsed.data.ownerWorkspaceId : workspace.ownerWorkspaceId;

  if (finalType === "company" && (!finalOwnerWorkspaceId || finalOwnerWorkspaceId.trim() === "")) {
    return NextResponse.json({ success: false, message: "Owner workspace is mandatory for company workspaces" }, { status: 400 });
  }

  if (Object.keys(companyUpdateData).length > 0) {
    updateData.companyDetails = {
      upsert: {
        create: {
          name: companyUpdateData.name || workspace.name,
          ...companyUpdateData
        },
        update: companyUpdateData
      }
    };
  }

  const updatedWorkspace = await db.workspace.update({
    where: { id },
    data: updateData,
    include: { companyDetails: true }
  });

  const responseData = {
    ...updatedWorkspace,
    _id: updatedWorkspace.id,
    code: updatedWorkspace.companyDetails?.code || "",
    description: updatedWorkspace.companyDetails?.description || "",
    cin: updatedWorkspace.companyDetails?.cin || "",
    registrationNumber: updatedWorkspace.companyDetails?.registrationNumber || "",
    address: updatedWorkspace.companyDetails?.address || ""
  };

  return NextResponse.json({
    success: true,
    message: "Workspace updated successfully",
    data: responseData
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "ceo")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  
  const workspace = await db.workspace.findUnique({ where: { id } });
  if (!workspace || workspace.isDeleted) {
    return NextResponse.json({ success: false, message: "Workspace not found" }, { status: 404 });
  }

  await db.workspace.update({
    where: { id },
    data: { isDeleted: true }
  });

  return NextResponse.json({
    success: true,
    message: "Workspace deleted successfully"
  });
}
