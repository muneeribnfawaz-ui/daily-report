import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";
import { ensureDefaultTeamTypes } from "@/lib/bootstrap";
import { formatTeamTypeShowName } from "@/lib/team-types";
import { authorizeApi } from "@/lib/api-auth";

function toInternalTeamTypeName(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toUpperCase();
}

const teamTypeSchema = z.object({
  showName: z.string().min(2),
  department: z.enum(["Construction", "Software", "Finance", "Marketing"]).optional(),
  subTeams: z.array(z.enum(["Physical", "Digital"])).optional().default([]),
  isActive: z.boolean().optional().default(true),
  isDeleted: z.boolean().optional().default(false)
});

export async function GET(request: Request) {
  const auth = await authorizeApi(["admin", "ceo", "hod", "report_manager", "team_lead"]);
  if (!auth.authorized) return auth.response;
  const user = auth.user;

  const url = new URL(request.url);
  const department = url.searchParams.get("department");
  const includeInactive = url.searchParams.get("includeInactive") === "true";

  await ensureDefaultTeamTypes();
  
  const filter: Record<string, any> = {};
  if (department && department !== "all") {
    filter.department = department;
  }
  if (!includeInactive) {
    filter.isActive = true;
  }

  if (user.role !== "admin" && user.role !== "ceo") {
    const allowedDepartments = user.departments?.map((d: any) => d.name) || [];
    const allowedTeamNames = user.teamNames || [];

    if (allowedDepartments.length > 0 || allowedTeamNames.length > 0) {
      const roleFilter: Record<string, any>[] = [];
      if (allowedDepartments.length > 0) {
        roleFilter.push({ department: { in: allowedDepartments } });
      }
      if (allowedTeamNames.length > 0) {
        roleFilter.push({ name: { in: allowedTeamNames } });
      }
      
      filter.AND = filter.AND || [];
      filter.AND.push({ OR: roleFilter });
    } else {
      filter.id = "none"; // Return empty if no assignments
    }
  }

  const teamTypes = await db.teamType.findMany({ where: filter, orderBy: { createdAt: 'desc' } });
  return NextResponse.json({
    success: true,
    data: teamTypes.map((teamType) => ({
      ...teamType,
      showName: formatTeamTypeShowName(teamType)
    }))
  });
}

export async function POST(request: Request) {
  const auth = await authorizeApi(["admin", "ceo", "hod"]);
  if (!auth.authorized) return auth.response;
  const user = auth.user;

  const body = await request.json();
  const parsed = teamTypeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid payload", errors: parsed.error.format() }, { status: 400 });
  }

  const internalName = toInternalTeamTypeName(parsed.data.showName);
  if (!internalName) {
    return NextResponse.json({ success: false, message: "Invalid team type name" }, { status: 400 });
  }

    const existing = await db.teamType.findFirst({ where: { name: internalName } });
  if (existing) {
    return NextResponse.json({ success: false, message: "A team type with this name already exists" }, { status: 409 });
  }

  const newTeamType = await db.teamType.create({
    data: {
      name: internalName,
      showName: parsed.data.showName,
      department: parsed.data.department ?? "",
      subTeams: parsed.data.department === "Marketing" ? parsed.data.subTeams : [],
      isActive: parsed.data.isActive,
      isDeleted: parsed.data.isDeleted,
      createdBy: user.name || "System"
    }
  });

  return NextResponse.json({
    success: true,
    data: {
      ...newTeamType,
      showName: formatTeamTypeShowName(newTeamType)
    }
  }, { status: 201 });
}

