import db from "@/lib/db";

import { formatDisplayName } from "@/lib/utils";

export function formatTeamTypeShowName(teamType: any) {
  const existingShowName = teamType.showName?.trim();
  if (existingShowName) return formatDisplayName(existingShowName);

  const internalName = teamType.name?.trim();
  if (!internalName) return "";

  return formatDisplayName(internalName);
}

export async function getActiveTeamTypeNames() {
  const teamTypes = await db.teamType.findMany({ where: { isActive: true, isDeleted: false } });
  return teamTypes.map((teamType) => teamType.name);
}

export async function getActiveTeamTypeShowNameMap() {
  const teamTypes = await db.teamType.findMany({ where: { isActive: true, isDeleted: false } });

  return Object.fromEntries(
    teamTypes
      .filter((teamType) => Boolean(teamType.name?.trim()))
      .map((teamType) => [teamType.name, formatTeamTypeShowName(teamType)])
  ) as Record<string, string>;
}

export async function isValidTeamTypeName(teamName: string) {
  const teamNames = await getActiveTeamTypeNames();
  return teamNames.includes(teamName);
}


export async function getTeamNamesByDepartment(department: string): Promise<string[]> {
  const teamTypes = await db.teamType.findMany({ where: { department, isDeleted: false } });
  return teamTypes.map((t) => t.name as string);
}
