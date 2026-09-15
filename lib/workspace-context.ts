import db from "@/lib/db";

export type WorkspaceUser = {
  id: string;
  role: string;
  workspaceId?: string;
};

/**
 * Returns all workspace IDs that the user is authorized to access.
 * - Admin: All active, non-deleted workspaces.
 * - CEO: Workspaces where the CEO has direct membership + all company workspaces owned by the CEO's executive workspace.
 * - Other roles: Workspaces where the user has an active WorkspaceMember profile.
 */
export async function getUserAllowedWorkspaceIds(user: WorkspaceUser): Promise<string[]> {
  if (user.role === "admin") {
    const allWorkspaces = (await db.workspace?.findMany?.({
      where: { isDeleted: false, isActive: true },
      select: { id: true }
    })) || [];
    return allWorkspaces.map((w: any) => String(w.id));
  }

  if (user.role === "ceo") {
    const memberships = (await db.workspaceMember?.findMany?.({
      where: {
        userId: user.id,
        status: "active",
        isActive: true
      },
      include: { workspace: true }
    })) || [];

    const ceoWorkspaceIds = memberships
      .filter((m: any) => m?.workspace?.type === "ceo")
      .map((m: any) => String(m.workspaceId));

    const directCompanyWorkspaceIds = memberships
      .filter((m: any) => m?.workspace?.type !== "ceo")
      .map((m: any) => String(m.workspaceId));

    if (user.workspaceId && !ceoWorkspaceIds.includes(user.workspaceId) && !directCompanyWorkspaceIds.includes(user.workspaceId)) {
      ceoWorkspaceIds.push(String(user.workspaceId));
    }

    const ownedWorkspaces = ceoWorkspaceIds.length > 0 && db.workspace?.findMany
      ? (await db.workspace.findMany({
          where: {
            ownerWorkspaceId: { in: ceoWorkspaceIds },
            isDeleted: false,
            isActive: true
          },
          select: { id: true }
        })) || []
      : [];

    const ownedWorkspaceIds = ownedWorkspaces.map((w: any) => String(w.id));

    return Array.from(new Set([...directCompanyWorkspaceIds, ...ownedWorkspaceIds, ...ceoWorkspaceIds]));
  }

  const memberships = (await db.workspaceMember?.findMany?.({
    where: {
      userId: user.id,
      status: "active",
      isActive: true
    },
    select: { workspaceId: true }
  })) || [];

  const allowedIds = memberships.map((m: any) => String(m.workspaceId));
  if (user.workspaceId) {
    allowedIds.push(String(user.workspaceId));
  }

  return Array.from(new Set(allowedIds));
}

/**
 * Builds a canonical Prisma/database where-clause filter for workspaceId based on
 * user permissions and optional requested workspace context (e.g. from header or query param).
 */
export async function buildWorkspaceFilter(
  user: WorkspaceUser,
  requestedWorkspaceId?: string | null
): Promise<Record<string, any>> {
  const filter: Record<string, any> = {};

  if (user.role === "admin") {
    if (requestedWorkspaceId && requestedWorkspaceId !== "all") {
      filter.workspaceId = requestedWorkspaceId;
    }
    return filter;
  }

  const allowedWorkspaceIds = await getUserAllowedWorkspaceIds(user);

  if (requestedWorkspaceId && requestedWorkspaceId !== "all") {
    filter.workspaceId = allowedWorkspaceIds.includes(requestedWorkspaceId)
      ? requestedWorkspaceId
      : "non_existent_id";
  } else {
    filter.workspaceId = { in: allowedWorkspaceIds };
  }

  return filter;
}

/**
 * Checks whether a specific target workspace ID is authorized for the given user.
 */
export async function isWorkspaceAuthorizedForUser(
  user: WorkspaceUser,
  targetWorkspaceId?: string | null
): Promise<boolean> {
  if (user.role === "admin") return true;
  if (!targetWorkspaceId) return false;

  const allowedWorkspaceIds = await getUserAllowedWorkspaceIds(user);
  return allowedWorkspaceIds.includes(String(targetWorkspaceId));
}
