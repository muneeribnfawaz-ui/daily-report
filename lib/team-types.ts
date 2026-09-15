import db from "@/lib/db";

import { formatDisplayName } from "@/lib/utils";

export function formatTeamTypeShowName(teamType: any) {
  const existingShowName = teamType.showName?.trim();
  if (existingShowName) return formatDisplayName(existingShowName);

  const internalName = teamType.name?.trim();
  if (!internalName) return "";

  return formatDisplayName(internalName);
}

export async function getActiveTeamTypeNames(workspaceId?: string) {
  const where: Record<string, any> = { isActive: true, isDeleted: false };
  if (workspaceId && workspaceId !== "all") {
    where.workspaceId = workspaceId;
  }
  const teamTypes = await db.teamType.findMany({ where });
  return teamTypes.map((teamType) => teamType.name);
}

export async function getActiveTeamTypeShowNameMap(workspaceId?: string) {
  const where: Record<string, any> = { isActive: true, isDeleted: false };
  if (workspaceId && workspaceId !== "all") {
    where.workspaceId = workspaceId;
  }
  const teamTypes = await db.teamType.findMany({ where });

  return Object.fromEntries(
    teamTypes
      .filter((teamType) => Boolean(teamType.name?.trim()))
      .map((teamType) => [teamType.name, formatTeamTypeShowName(teamType)])
  ) as Record<string, string>;
}

export async function isValidTeamTypeName(teamName: string, workspaceId?: string) {
  const teamNames = await getActiveTeamTypeNames(workspaceId);
  return teamNames.includes(teamName);
}

export async function getTeamNamesByDepartment(department: string, workspaceId?: string): Promise<string[]> {
  const where: Record<string, any> = { department, isDeleted: false };
  if (workspaceId && workspaceId !== "all") {
    where.workspaceId = workspaceId;
  }
  const teamTypes = await db.teamType.findMany({ where });
  return teamTypes.map((t) => t.name as string);
}
