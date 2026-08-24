import User from "@/models/User";
import WorkspaceMember from "@/models/WorkspaceMember";

type VisibleUser = {
  _id?: unknown;
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
  const memberFilter: Record<string, any> = { isActive: true };

  if (user.role !== "admin") {
    const memberships = await WorkspaceMember.find({
      userId: user.id,
      status: "active",
      isActive: true
    }).select("workspaceId").lean() as any[];
    const allowedWorkspaceIds = memberships.map(m => String(m.workspaceId));

    if (user.workspaceId && user.workspaceId !== "all") {
      memberFilter.workspaceId = allowedWorkspaceIds.includes(user.workspaceId) ? user.workspaceId : "non_existent_id";
    } else {
      memberFilter.workspaceId = { $in: allowedWorkspaceIds };
    }
  } else {
    if (user.workspaceId && user.workspaceId !== "all") {
      memberFilter.workspaceId = user.workspaceId;
    }
  }
  const members = (await WorkspaceMember.find(memberFilter).populate("userId").lean()) as any[];

  const allUsers: VisibleUser[] = members.map((m) => {
    const u = m.userId || {};
    return {
      _id: u._id,
      name: u.name,
      managerName: m.managerName,
      role: m.role,
      departments: m.departments,
      teamName: m.departments?.[0]?.name || null,
      teamNames: m.departments?.map((d: any) => d.name) || []
    };
  });
  const visibleEmployeeIds = new Set<string>();

  // Admin sees all
  if (user.role === "admin") {
    return null;
  }

  // CEO role filtering
  if (user.role === "ceo") {
    if (options?.scope === "hod") {
      for (const currentUser of allUsers) {
        if (currentUser._id && currentUser.role === "hod") {
          visibleEmployeeIds.add(String(currentUser._id));
        }
      }
      return Array.from(visibleEmployeeIds);
    }
    return null; // "all" mode: see everyone
  }

  // HOD role filtering (HOD approves TL reports and department members)
  if (user.role === "hod") {
    if (options?.scope === "tl") {
      const userDepts = new Set(user.departments?.map((d) => d.name) ?? []);
      for (const currentUser of allUsers) {
        if (!currentUser._id) continue;
        const inDept = currentUser.departments?.some((dept) => userDepts.has(dept.name));
        if (currentUser.role === "team_lead" && (inDept || userDepts.size === 0)) {
          visibleEmployeeIds.add(String(currentUser._id));
        }
      }
      return Array.from(visibleEmployeeIds);
    }
    return null; // default HOD view: see all
  }

  if (user.role === "report_manager") {
    // Report Manager can only see Software and Marketing (Digital)
    for (const currentUser of allUsers) {
      if (!currentUser._id) continue;
      const isAllowed = currentUser.departments?.some(
        (dept) =>
          dept.name === "Software" ||
          (dept.name === "Marketing" && dept.subTeams?.includes("Digital"))
      );
      if (isAllowed) {
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
      visibleEmployeeIds.add(String(currentUser._id));
    }
  }

  return Array.from(visibleEmployeeIds);
}

