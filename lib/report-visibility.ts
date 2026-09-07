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
  }
) {
  const memberFilter: any = { isActive: true };

  if (user.role !== "admin") {
    const memberships = await db.workspaceMember.findMany({
      where: {
        userId: user.id,
        status: "active",
        isActive: true
      },
      select: { workspaceId: true }
    });
    const allowedWorkspaceIds = memberships.map(m => m.workspaceId);

    if (user.workspaceId && user.workspaceId !== "all") {
      memberFilter.workspaceId = allowedWorkspaceIds.includes(user.workspaceId) ? user.workspaceId : "non_existent_id";
    } else {
      memberFilter.workspaceId = { in: allowedWorkspaceIds };
    }
  } else {
    if (user.workspaceId && user.workspaceId !== "all") {
      memberFilter.workspaceId = user.workspaceId;
    }
  }

  const members = await db.workspaceMember.findMany({
    where: memberFilter,
    include: { user: true, departments: true }
  });

  const allUsers: VisibleUser[] = members.map((m) => {
    return {
      _id: m.userId,
      name: m.user?.name,
      managerName: m.managerName,
      role: m.role,
      departments: m.departments.map(d => ({ name: d.name, subTeams: d.subTeams })),
      teamName: m.teamName || null,
      teamNames: m.teamNames || []
    };
  });

  const visibleEmployeeIds = new Set<string>();

  // Admin and CEO see HOD, RM, TL, TM
  if (user.role === "admin" || user.role === "ceo") {
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
    const userDepts = new Set(user.departments?.map((d) => d.name) ?? []);
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
    // Report Manager can only see Software and Marketing (Digital) and only TL, TM roles
    for (const currentUser of allUsers) {
      if (!currentUser._id) continue;
      if (currentUser._id === user.id) {
        visibleEmployeeIds.add(String(currentUser._id));
        continue;
      }
      const isAllowed = currentUser.departments?.some(
        (dept) =>
          dept.name === "Software" ||
          (dept.name === "Marketing" && dept.subTeams?.includes("Digital"))
      );
      if (isAllowed && ["team_lead", "team_member"].includes(currentUser.role || "")) {
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

