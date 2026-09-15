import db from "@/lib/db";

/**
 * Resolves all active CEO user IDs for a given workspace/company context.
 * Strictly scopes to CEOs associated with the target workspace or its owning CEO workspace.
 */
export async function getCeoUserIdsForWorkspace(workspaceId: string): Promise<string[]> {
  if (!workspaceId || workspaceId === "all") return [];

  const targetWorkspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, type: true, ownerWorkspaceId: true }
  });

  const relevantWorkspaceIds = [workspaceId];
  if (targetWorkspace?.ownerWorkspaceId) {
    relevantWorkspaceIds.push(targetWorkspace.ownerWorkspaceId);
  }

  // If workspaceId is a CEO workspace, also check any child company workspaces
  if (targetWorkspace?.type === "ceo") {
    const ownedWorkspaces = await db.workspace.findMany({
      where: { ownerWorkspaceId: workspaceId, isDeleted: false, isActive: true },
      select: { id: true }
    });
    ownedWorkspaces.forEach((w) => relevantWorkspaceIds.push(w.id));
  }

  const ceoMemberships = await db.workspaceMember.findMany({
    where: {
      workspaceId: { in: relevantWorkspaceIds },
      role: "ceo",
      status: "active",
      isActive: true,
      user: { isDeleted: false }
    },
    select: { userId: true }
  });

  let ceoUserIds = Array.from(new Set(ceoMemberships.map((m) => m.userId)));

  // Fallback: If no workspace-scoped CEO membership found, fallback to system CEOs
  if (ceoUserIds.length === 0) {
    const systemCeos = await db.user.findMany({
      where: { role: "ceo", isDeleted: false },
      select: { id: true }
    });
    ceoUserIds = systemCeos.map((u) => u.id);
  }

  return ceoUserIds;
}

/**
 * Resolves all active HOD user IDs for a given workspace/company context.
 * Strictly scopes to active HODs belonging to the specified company workspace.
 */
export async function getHodUserIdsForWorkspace(workspaceId: string): Promise<string[]> {
  if (!workspaceId || workspaceId === "all") return [];

  const hodMemberships = await db.workspaceMember.findMany({
    where: {
      workspaceId,
      role: "hod",
      status: "active",
      isActive: true,
      user: { isDeleted: false }
    },
    select: {
      userId: true,
      departments: { select: { name: true } }
    }
  });

  if (hodMemberships.length > 0) {
    const financeHods = hodMemberships.filter((m) =>
      m.departments.some((d) => d.name?.toLowerCase() === "finance")
    );
    const targetMembers = financeHods.length > 0 ? financeHods : hodMemberships;
    return Array.from(new Set(targetMembers.map((m) => m.userId)));
  }

  const workspaceHodUsers = await db.user.findMany({
    where: {
      role: "hod",
      isDeleted: false,
      workspaceMembers: {
        some: {
          workspaceId,
          status: "active",
          isActive: true
        }
      }
    },
    select: { id: true }
  });

  return Array.from(new Set(workspaceHodUsers.map((u) => u.id)));
}

export interface NotifyMoneyRequestParams {
  moneyRequests: Array<{
    id: string;
    particulars: string;
    amountINR: number;
    description?: string;
  }>;
  submitter: {
    id: string;
    name: string;
  };
  workspaceId: string;
}

/**
 * Dispatches notifications to authorized HOD users when a new Money Request is created.
 */
export async function notifyHodOfMoneyRequests({
  moneyRequests,
  submitter,
  workspaceId
}: NotifyMoneyRequestParams): Promise<void> {
  if (!moneyRequests || moneyRequests.length === 0) return;

  try {
    const hodRecipientIds = await getHodUserIdsForWorkspace(workspaceId);
    const validHodIds = hodRecipientIds.filter((id) => id !== submitter.id);

    if (validHodIds.length === 0) return;

    for (const req of moneyRequests) {
      const linkUrl = `/finance/requests/${req.id}`;

      // Check for existing unread notifications for this money request to prevent duplicates
      const existingNotifs = await db.notification.findMany({
        where: {
          recipientId: { in: validHodIds },
          linkUrl,
          isRead: false
        },
        select: { recipientId: true }
      });

      const alreadyNotified = new Set(existingNotifs.map((n) => n.recipientId));
      const recipientsToNotify = validHodIds.filter((id) => !alreadyNotified.has(id));

      if (recipientsToNotify.length > 0) {
        const formattedAmount = Number(req.amountINR || 0).toLocaleString("en-IN");
        const title = `New Money Request from ${submitter.name}`;
        const message = `${submitter.name} submitted a money request for ${req.particulars || "Money Request"}. Amount: ₹${formattedAmount}. Awaiting your review.`;

        const notificationsToCreate = recipientsToNotify.map((hodId) => ({
          recipientId: hodId,
          type: "money_request_approval_request",
          title,
          message,
          metadata: {
            moneyRequestId: req.id,
            particulars: req.particulars,
            amountINR: req.amountINR,
            submittedBy: submitter.name,
            workspaceId
          },
          linkUrl,
          isRead: false
        }));

        if (db.notification.createMany) {
          await db.notification.createMany({ data: notificationsToCreate });
        } else {
          for (const notif of notificationsToCreate) {
            await db.notification.create({ data: notif });
          }
        }
      }
    }
  } catch (error) {
    console.error("Failed to notify HOD of money requests:", error);
  }
}

/**
 * Dispatches notifications to authorized CEO users when a new Money Request is created.
 */
export async function notifyCeoOfMoneyRequests({
  moneyRequests,
  submitter,
  workspaceId
}: NotifyMoneyRequestParams): Promise<void> {
  if (!moneyRequests || moneyRequests.length === 0) return;

  try {
    const ceoRecipientIds = await getCeoUserIdsForWorkspace(workspaceId);
    const validCeoIds = ceoRecipientIds.filter((id) => id !== submitter.id);

    if (validCeoIds.length === 0) return;

    for (const req of moneyRequests) {
      const linkUrl = `/finance/requests/${req.id}`;

      // Check for existing unread notifications for this money request to prevent duplicates
      const existingNotifs = await db.notification.findMany({
        where: {
          recipientId: { in: validCeoIds },
          linkUrl,
          isRead: false
        },
        select: { recipientId: true }
      });

      const alreadyNotified = new Set(existingNotifs.map((n) => n.recipientId));
      const recipientsToNotify = validCeoIds.filter((id) => !alreadyNotified.has(id));

      if (recipientsToNotify.length > 0) {
        const formattedAmount = Number(req.amountINR || 0).toLocaleString("en-IN");
        const title = `New Money Request from ${submitter.name}`;
        const message = `${submitter.name} submitted a money request for ${req.particulars || "Money Request"}. Amount: ₹${formattedAmount}`;

        const notificationsToCreate = recipientsToNotify.map((ceoId) => ({
          recipientId: ceoId,
          type: "money_request_approval_request",
          title,
          message,
          metadata: {
            moneyRequestId: req.id,
            particulars: req.particulars,
            amountINR: req.amountINR,
            submittedBy: submitter.name,
            workspaceId
          },
          linkUrl,
          isRead: false
        }));

        if (db.notification.createMany) {
          await db.notification.createMany({ data: notificationsToCreate });
        } else {
          for (const notif of notificationsToCreate) {
            await db.notification.create({ data: notif });
          }
        }
      }
    }
  } catch (error) {
    console.error("Failed to notify CEO of money requests:", error);
  }
}

export interface NotifyEditAccessApprovedParams {
  report: {
    id: string;
    employeeId?: string | null;
    reportDate: Date | string;
    workspaceId?: string | null;
  };
  approver: {
    id: string;
    name: string;
  };
}

/**
 * Dispatches an "Edit Request Approved" notification to the original report author.
 * Ensures the recipient is strictly the report author (not the approver) and prevents duplicate unread notifications.
 */
export async function notifyReportEditAccessApproved({
  report,
  approver
}: NotifyEditAccessApprovedParams): Promise<void> {
  if (!report.employeeId || String(report.employeeId) === String(approver.id)) return;

  try {
    const formattedDate = new Date(report.reportDate).toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

    const linkUrl = `/daily-report/my-reports`;

    // Check for existing unread notification for this report to prevent duplicates
    const existingNotif = await db.notification.findFirst({
      where: {
        recipientId: String(report.employeeId),
        type: "edit_request_approved",
        linkUrl,
        isRead: false
      }
    });

    if (!existingNotif) {
      await db.notification.create({
        data: {
          recipientId: String(report.employeeId),
          type: "edit_request_approved",
          title: "Edit Request Approved",
          message: `${approver.name} approved your request to edit the Daily Report for ${formattedDate}. You can now make changes.`,
          metadata: {
            reportId: report.id,
            reportDate: report.reportDate,
            approvedBy: approver.name,
            approvedById: approver.id,
            workspaceId: report.workspaceId || ""
          },
          linkUrl,
          isRead: false
        }
      });
    }
  } catch (error) {
    console.error("Failed to notify report author of edit approval:", error);
  }
}

export interface NotifyEditAccessRejectedParams {
  report: {
    id: string;
    employeeId?: string | null;
    reportDate: Date | string;
    workspaceId?: string | null;
  };
  rejecter: {
    id: string;
    name: string;
  };
}

/**
 * Dispatches an "Edit Request Rejected" notification to the original report author.
 */
export async function notifyReportEditAccessRejected({
  report,
  rejecter
}: NotifyEditAccessRejectedParams): Promise<void> {
  if (!report.employeeId || String(report.employeeId) === String(rejecter.id)) return;

  try {
    const formattedDate = new Date(report.reportDate).toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

    const linkUrl = `/daily-report/my-reports`;

    await db.notification.create({
      data: {
        recipientId: String(report.employeeId),
        type: "edit_request_rejected",
        title: "Edit Request Rejected",
        message: `${rejecter.name} rejected your edit request for the Daily Report on ${formattedDate}.`,
        metadata: {
          reportId: report.id,
          reportDate: report.reportDate,
          rejectedBy: rejecter.name,
          rejectedById: rejecter.id,
          workspaceId: report.workspaceId || ""
        },
        linkUrl,
        isRead: false
      }
    });
  } catch (error) {
    console.error("Failed to notify report author of edit rejection:", error);
  }
}

export interface NotifyEditAccessRequestedParams {
  report: {
    id: string;
    name?: string | null;
    employeeId?: string | null;
    reportDate: Date | string;
    teamName?: string | null;
    workspaceId: string;
  };
  requester: {
    id: string;
    name: string;
    role?: string | null;
  };
  reason?: string;
}

/**
 * Dispatches "Edit Request Pending" notifications to the authorized senior reviewer(s)
 * based on the role hierarchy (Team Member -> Team Lead, Team Lead -> Report Manager/HOD, Report Manager -> HOD).
 * Strictly enforces workspace isolation and prevents duplicate unread notifications.
 */
export async function notifyReportEditAccessRequested({
  report,
  requester,
  reason = ""
}: NotifyEditAccessRequestedParams): Promise<void> {
  if (!report.workspaceId || !requester.id) return;

  try {
    // 1. Fetch requester active memberships within the report's company workspace (or all active memberships)
    const requesterMemberships = await db.workspaceMember.findMany({
      where: {
        userId: requester.id,
        isActive: true,
        status: "active",
        ...(report.workspaceId ? { workspaceId: report.workspaceId } : {})
      },
      include: { departments: true }
    });

    const primaryMembership = requesterMemberships[0];
    const requesterRole = requester.role || primaryMembership?.role || "team_member";
    const requesterTeamNames = Array.from(
      new Set(
        [
          report.teamName,
          primaryMembership?.teamName,
          ...(requesterMemberships.flatMap((m) => [...(m.teamNames || []), m.teamName]))
        ].filter((v): v is string => Boolean(v && v.trim()))
      )
    );
    const requesterManagerNames = Array.from(
      new Set(requesterMemberships.map((m) => m.managerName).filter(Boolean))
    );
    const requesterDirectDepts = Array.from(
      new Set(requesterMemberships.flatMap((m) => m.departments?.map((d) => d.name) || []).filter(Boolean))
    );

    // 2. Resolve target department names from TeamType records in this workspace & direct departments
    const teamTypes = db.teamType?.findMany
      ? await db.teamType.findMany({
          where: {
            workspaceId: report.workspaceId,
            isDeleted: false,
            OR: [
              { name: { in: requesterTeamNames } },
              { showName: { in: requesterTeamNames } }
            ]
          },
          select: { department: true }
        })
      : [];

    const allTargetDeptNames = new Set<string>([
      ...requesterDirectDepts,
      ...teamTypes.map((t) => t.department).filter(Boolean)
    ]);
    if (report.teamName) {
      allTargetDeptNames.add(report.teamName);
    }

    type ApproverInfo = {
      userId: string;
      role: string;
    };
    const approversMap = new Map<string, ApproverInfo>();

    // 3. Resolve approvers based on hierarchy
    if (requesterRole === "team_member") {
      // Team Member -> Team Lead
      const orConditions: any[] = [];
      if (requesterManagerNames.length > 0) {
        orConditions.push({ user: { name: { in: requesterManagerNames } } });
      }
      if (requesterTeamNames.length > 0) {
        orConditions.push({ teamName: { in: requesterTeamNames } });
        orConditions.push({ teamNames: { hasSome: requesterTeamNames } });
      }
      if (allTargetDeptNames.size > 0) {
        orConditions.push({ departments: { some: { name: { in: Array.from(allTargetDeptNames) } } } });
      }

      const tlMemberships = await db.workspaceMember.findMany({
        where: {
          workspaceId: report.workspaceId,
          isActive: true,
          status: "active",
          role: "team_lead",
          ...(orConditions.length > 0 ? { OR: orConditions } : {})
        },
        select: { userId: true, role: true }
      });

      tlMemberships.forEach((m) => {
        if (m.userId !== requester.id) {
          approversMap.set(m.userId, { userId: m.userId, role: m.role || "team_lead" });
        }
      });
    } else if (requesterRole === "team_lead") {
      // Team Lead -> Report Manager
      const rmOrConditions: any[] = [];
      if (requesterManagerNames.length > 0) {
        rmOrConditions.push({ user: { name: { in: requesterManagerNames } } });
      }
      if (allTargetDeptNames.size > 0) {
        rmOrConditions.push({ departments: { some: { name: { in: Array.from(allTargetDeptNames) } } } });
      }
      if (requesterTeamNames.length > 0) {
        rmOrConditions.push({ departments: { some: { subTeams: { hasSome: requesterTeamNames } } } });
      }

      let rmMemberships = await db.workspaceMember.findMany({
        where: {
          workspaceId: report.workspaceId,
          isActive: true,
          status: "active",
          role: "report_manager",
          ...(rmOrConditions.length > 0 ? { OR: rmOrConditions } : {})
        },
        include: { departments: true, user: true }
      });

      // If no specific match, check all Report Managers in workspace whose department list is empty (manages all) or matches target depts
      if (rmMemberships.length === 0) {
        const allRms = await db.workspaceMember.findMany({
          where: {
            workspaceId: report.workspaceId,
            isActive: true,
            status: "active",
            role: "report_manager"
          },
          include: { departments: true, user: true }
        });
        rmMemberships = allRms.filter(
          (rm) => !rm.departments || rm.departments.length === 0 || rm.departments.some((d) => allTargetDeptNames.has(d.name))
        );
      }

      if (rmMemberships.length > 0) {
        rmMemberships.forEach((m) => {
          if (m.userId !== requester.id) {
            approversMap.set(m.userId, { userId: m.userId, role: m.role || "report_manager" });
          }
        });
      } else {
        // Fallback to HOD in this workspace
        const hodOrConditions: any[] = [];
        if (requesterManagerNames.length > 0) {
          hodOrConditions.push({ user: { name: { in: requesterManagerNames } } });
        }
        if (allTargetDeptNames.size > 0) {
          hodOrConditions.push({ departments: { some: { name: { in: Array.from(allTargetDeptNames) } } } });
        }

        const hodMemberships = await db.workspaceMember.findMany({
          where: {
            workspaceId: report.workspaceId,
            isActive: true,
            status: "active",
            role: "hod",
            ...(hodOrConditions.length > 0 ? { OR: hodOrConditions } : {})
          },
          select: { userId: true, role: true }
        });

        hodMemberships.forEach((m) => {
          if (m.userId !== requester.id) {
            approversMap.set(m.userId, { userId: m.userId, role: m.role || "hod" });
          }
        });
      }
    } else if (requesterRole === "report_manager") {
      // Report Manager -> HOD
      const hodOrConditions: any[] = [];
      if (requesterManagerNames.length > 0) {
        hodOrConditions.push({ user: { name: { in: requesterManagerNames } } });
      }
      if (allTargetDeptNames.size > 0) {
        hodOrConditions.push({ departments: { some: { name: { in: Array.from(allTargetDeptNames) } } } });
      }

      const hodMemberships = await db.workspaceMember.findMany({
        where: {
          workspaceId: report.workspaceId,
          isActive: true,
          status: "active",
          role: "hod",
          ...(hodOrConditions.length > 0 ? { OR: hodOrConditions } : {})
        },
        select: { userId: true, role: true }
      });

      hodMemberships.forEach((m) => {
        if (m.userId !== requester.id) {
          approversMap.set(m.userId, { userId: m.userId, role: m.role || "hod" });
        }
      });
    }

    approversMap.delete(requester.id);

    if (approversMap.size === 0) return;

    const formattedDate = new Date(report.reportDate).toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

    const notificationsToCreate: any[] = [];

    for (const approver of approversMap.values()) {
      let linkUrl = `/daily-report/my-reports`;
      if (approver.role === "team_lead") {
        linkUrl = `/team-lead/reports?employee=${encodeURIComponent(requester.name)}`;
      } else if (approver.role === "report_manager") {
        linkUrl = `/reports?employee=${encodeURIComponent(requester.name)}`;
      } else if (approver.role === "hod") {
        linkUrl = `/hod/reports?employee=${encodeURIComponent(requester.name)}`;
      } else if (approver.role === "admin" || approver.role === "ceo") {
        linkUrl = `/admin/reports?employee=${encodeURIComponent(requester.name)}`;
      }

      // Check for existing unread notification to prevent duplicate notifications
      const existingNotif = await db.notification.findFirst({
        where: {
          recipientId: approver.userId,
          type: "edit_request_pending",
          linkUrl,
          isRead: false
        }
      });

      if (!existingNotif) {
        const message = reason
          ? `${requester.name} has requested to edit their Daily Report for ${formattedDate}. Reason: "${reason}"`
          : `${requester.name} has requested to edit their Daily Report for ${formattedDate}.`;

        notificationsToCreate.push({
          recipientId: approver.userId,
          type: "edit_request_pending",
          title: "New Edit Request",
          message,
          metadata: {
            reportId: report.id,
            reportDate: report.reportDate,
            requestedBy: requester.name,
            requestedById: requester.id,
            reason: reason || "",
            workspaceId: report.workspaceId
          },
          linkUrl,
          isRead: false
        });
      }
    }

    if (notificationsToCreate.length > 0) {
      if (db.notification.createMany) {
        await db.notification.createMany({ data: notificationsToCreate });
      } else {
        for (const notif of notificationsToCreate) {
          await db.notification.create({ data: notif });
        }
      }
    }
  } catch (error) {
    console.error("Failed to dispatch edit request pending notifications:", error);
  }
}
