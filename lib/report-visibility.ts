import db from "@/lib/db";

type VisibleUser = {
  _id?: string;
  name?: string | null;
  managerName?: string | null;
  teamName?: string | null;
  teamNames?: string[] | null;
  departments?: { name: string; subTeams?: string[] }[];
  role?: string | null;
};

function collectDescendantUserNames(users: Array<{ name?: string | null; managerName?: string | null }>, rootManagerName: string) {
  const descendantNames = new Set<string>();
  const queue = [rootManagerName];

  while (queue.length) {
    const currentManager = queue.shift();
    if (!currentManager) continue;

    for (const user of users) {
      if (!user.name || !user.managerName) continue;
      if (user.managerName !== currentManager || descendantNames.has(user.name)) continue;

      descendantNames.add(user.name);
      queue.push(user.name);
    }
  }

  return descendantNames;
}

export async function getVisibleReportEmployeeIds(
  user: {
    id: string;
    name: string;
    role: string;
    workspaceId?: string;
    teamName?: string | null;
    departments?: { name: string; subTeams?: string[] }[];
  },
  options?: {
    scope?: "hod" | "tl" | "all";
    workspaceId?: string;
  }
) {
  const memberFilter: any = { isActive: true };

  const targetWorkspaceId = options?.workspaceId !== undefined
    ? options.workspaceId
    : (user.role === "ceo" || user.role === "admin" ? undefined : user.workspaceId);

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
    const directCompanyWorkspaceIds = memberships.filter(m => m.workspace?.type !== "ceo").map(m => m.workspaceId);

    const ownedWorkspaces = db.workspace?.findMany
      ? await db.workspace.findMany({
          where: {
            ownerWorkspaceId: { in: ceoWorkspaceIds },
            isDeleted: false,
            isActive: true
          },
          select: { id: true }
        })
      : [];
    const ownedWorkspaceIds = ownedWorkspaces.map(w => w.id);

    const allowedWorkspaceIds = Array.from(new Set([...directCompanyWorkspaceIds, ...ownedWorkspaceIds, ...ceoWorkspaceIds]));

    if (targetWorkspaceId && targetWorkspaceId !== "all") {
      memberFilter.workspaceId = allowedWorkspaceIds.includes(targetWorkspaceId) ? targetWorkspaceId : "non_existent_id";
    } else {
      memberFilter.workspaceId = { in: allowedWorkspaceIds };
    }
  } else if (user.role !== "admin") {
    const memberships = await db.workspaceMember.findMany({
      where: {
        userId: user.id,
        status: "active",
        isActive: true
      },
      select: { workspaceId: true }
    });
    const allowedWorkspaceIds = memberships.map(m => m.workspaceId);

    if (targetWorkspaceId && targetWorkspaceId !== "all") {
      memberFilter.workspaceId = allowedWorkspaceIds.includes(targetWorkspaceId) ? targetWorkspaceId : "non_existent_id";
    } else {
      memberFilter.workspaceId = { in: allowedWorkspaceIds };
    }
  } else {
    if (targetWorkspaceId && targetWorkspaceId !== "all") {
      memberFilter.workspaceId = targetWorkspaceId;
    }
  }

  const members = await db.workspaceMember.findMany({
    where: memberFilter,
    include: { user: true, departments: true }
  });

  const activeTeamTypes = db.teamType ? await db.teamType.findMany({
    where: { isDeleted: false },
    select: { name: true, showName: true, department: true, subTeams: true }
  }) : [];

  const teamTypeMap = new Map<string, { department: string; subTeams: string[] }>();
  for (const tt of activeTeamTypes) {
    if (tt.name) teamTypeMap.set(tt.name, { department: tt.department, subTeams: tt.subTeams || [] });
    if (tt.showName) teamTypeMap.set(tt.showName, { department: tt.department, subTeams: tt.subTeams || [] });
  }

  const allUsers: VisibleUser[] = members.map((m) => {
    const userTeams = [m.teamName, ...(m.teamNames || [])].filter(Boolean) as string[];
    const effectiveDepts: Array<{ name: string; subTeams?: string[] }> = (m.departments || []).map((d) => ({
      name: d.name,
      subTeams: d.subTeams || []
    }));

    for (const team of userTeams) {
      const tt = teamTypeMap.get(team);
      if (tt) {
        effectiveDepts.push({ name: tt.department, subTeams: [team, ...(tt.subTeams || [])] });
      }
      effectiveDepts.push({ name: team, subTeams: [] });
    }

    return {
      _id: m.userId,
      name: m.user?.name,
      managerName: m.managerName,
      role: m.role || m.user?.role,
      departments: effectiveDepts,
      teamName: m.teamName || null,
      teamNames: m.teamNames || []
    };
  });

  const visibleEmployeeIds = new Set<string>();

  // Admin and CEO see HOD, RM, TL, TM (or just HOD when scope === "hod")
  if (user.role === "admin" || user.role === "ceo") {
    if (options?.scope === "hod") {
      for (const currentUser of allUsers) {
        if (!currentUser._id) continue;
        if (currentUser.role === "hod" || currentUser._id === user.id) {
          visibleEmployeeIds.add(String(currentUser._id));
        }
      }
      return Array.from(visibleEmployeeIds);
    }
    for (const currentUser of allUsers) {
      if (!currentUser._id) continue;
      if (["hod", "report_manager", "team_lead", "team_member"].includes(currentUser.role || "")) {
        visibleEmployeeIds.add(String(currentUser._id));
      }
      if (currentUser._id === user.id) {
        visibleEmployeeIds.add(String(currentUser._id));
      }
    }
    return Array.from(visibleEmployeeIds);
  }

  // HOD role filtering (HOD approves TL reports and department members)
  if (user.role === "hod") {
    const userDepts = new Set(
      user.departments
        ?.map((d: any) => (typeof d === "string" ? d : d.name))
        .filter(Boolean) ?? []
    );
    if (options?.scope === "tl") {
      for (const currentUser of allUsers) {
        if (!currentUser._id) continue;
        const inDept = currentUser.departments?.some((dept) => userDepts.has(dept.name));
        if (currentUser.role === "team_lead" && (inDept || userDepts.size === 0)) {
          visibleEmployeeIds.add(String(currentUser._id));
        }
      }
      return Array.from(visibleEmployeeIds);
    }
    
    // Default HOD view: see RM, TL, TM in their assigned departments, plus themselves
    for (const currentUser of allUsers) {
      if (!currentUser._id) continue;
      const inDept = currentUser.departments?.some((dept) => userDepts.has(dept.name));
      if (currentUser._id === user.id) {
        visibleEmployeeIds.add(String(currentUser._id));
        continue;
      }
      if ((inDept || userDepts.size === 0) && ["report_manager", "team_lead", "team_member"].includes(currentUser.role || "")) {
        visibleEmployeeIds.add(String(currentUser._id));
      }
    }
    return Array.from(visibleEmployeeIds);
  }

  if (user.role === "report_manager") {
    const userDepts = new Map(
      user.departments?.map((d) => [d.name, new Set(d.subTeams ?? [])]) ?? []
    );

    for (const currentUser of allUsers) {
      if (!currentUser._id) continue;
      if (currentUser._id === user.id) {
        visibleEmployeeIds.add(String(currentUser._id));
        continue;
      }

      const isAllowed = currentUser.departments?.some((dept) => {
        if (userDepts.size === 0) return true;
        if (!userDepts.has(dept.name)) return false;
        const allowedSubTeams = userDepts.get(dept.name)!;
        if (allowedSubTeams.size === 0) return true;
        if (!dept.subTeams || dept.subTeams.length === 0) return true;
        return dept.subTeams.some((sub) => allowedSubTeams.has(sub));
      });

      if ((isAllowed || userDepts.size === 0) && currentUser.role === "team_lead") {
        visibleEmployeeIds.add(String(currentUser._id));
      }
    }
    return Array.from(visibleEmployeeIds);
  }

  // Team Lead role filtering (TL approves Team Members)
  const visibleUserNames = collectDescendantUserNames(
    allUsers as Array<{ name?: string | null; managerName?: string | null }>,
    user.name
  );

  if (user.name) {
    visibleUserNames.add(user.name);
  }

  for (const currentUser of allUsers) {
    if (!currentUser._id || !currentUser.name) continue;

    const isDescendant = visibleUserNames.has(currentUser.name);
    const isSameTeam =
      Boolean(user.teamName) &&
      (currentUser.teamName === user.teamName || currentUser.teamNames?.includes(user.teamName ?? ""));

    if (isDescendant || isSameTeam) {
      if (currentUser._id === user.id || currentUser.role === "team_member") {
        visibleEmployeeIds.add(String(currentUser._id));
      }
    }
  }

  return Array.from(visibleEmployeeIds);
}

