import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import TeamType from "@/models/TeamType";
import { z } from "zod";
import { formatTeamTypeShowName } from "@/lib/team-types";

const teamTypeUpdateSchema = z.object({
  showName: z.string().min(2).optional(),
  isActive: z.boolean().optional(),
  isDeleted: z.boolean().optional()
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const { id } = await Promise.resolve(params);
  await connectToDatabase();
  const teamType = await TeamType.findById(id).lean();
  if (!teamType) {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: {
      ...teamType,
      showName: formatTeamTypeShowName(teamType)
    }
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const { id } = await Promise.resolve(params);
  const body = await request.json();
  const parsed = teamTypeUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid team type payload" }, { status: 400 });
  }

  await connectToDatabase();
  const teamType = await TeamType.findById(id);
  if (!teamType) {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  }

  if (parsed.data.showName !== undefined) teamType.showName = parsed.data.showName.trim();
  if (parsed.data.isActive !== undefined) teamType.isActive = parsed.data.isActive;
  if (parsed.data.isDeleted !== undefined) teamType.isDeleted = parsed.data.isDeleted;

  const duplicate = await TeamType.findOne({ name: teamType.name, _id: { $ne: teamType._id } }).lean();
  if (duplicate) {
    return NextResponse.json({ success: false, message: "Team type already exists" }, { status: 409 });
  }

  await teamType.save();
  return NextResponse.json({
    success: true,
    data: {
      ...teamType.toObject(),
      showName: formatTeamTypeShowName(teamType.toObject())
    }
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const { id } = await Promise.resolve(params);

  await connectToDatabase();
  const teamType = await TeamType.findById(id);
  if (!teamType) {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  }

  teamType.isDeleted = true;
  teamType.isActive = false;
  await teamType.save();

  return NextResponse.json({
    success: true,
    data: {
      ...teamType.toObject(),
      showName: formatTeamTypeShowName(teamType.toObject())
    }
  });
}
