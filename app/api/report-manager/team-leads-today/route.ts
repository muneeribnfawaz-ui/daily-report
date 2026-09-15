import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isReportDateToday } from "@/lib/report-edit-access";
import { formatDisplayName } from "@/lib/utils";

import { mapReportRelations, reportRelationsInclude } from "@/lib/report-mapper";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (
      !user ||
      (user.role !== "report_manager" && user.role !== "admin" && user.role !== "ceo" && user.role !== "hod")
    ) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const url = new URL(request.url);
    const workspaceId =
      url.searchParams.get("workspaceId") || request.headers.get("x-workspace-id") || user.workspaceId;
    const dateParam = url.searchParams.get("date");
    let targetDate = new Date();
    if (dateParam) {
      const parsed = new Date(dateParam);
      if (!Number.isNaN(parsed.getTime())) {
        targetDate = parsed;
      }
    }

    const memberFilter: any = {
      role: "team_lead",
      status: "active",
      isActive: true
    };

    if (workspaceId && workspaceId !== "all") {
      memberFilter.workspaceId = workspaceId;
    }

    // Fetch team lead workspace members
    const teamLeadMembers = await db.workspaceMember.findMany({
      where: memberFilter,
      include: {
        user: true,
        departments: true
      }
    });

    // Fetch active team types to map teams to departments
    const activeTeamTypes = await db.teamType.findMany({
      where: { isDeleted: false },
      select: { name: true, showName: true, department: true, subTeams: true }
    });

    const teamTypeMap = new Map<string, { department: string; subTeams: string[] }>();
    for (const tt of activeTeamTypes) {
      if (tt.name) teamTypeMap.set(tt.name, { department: tt.department, subTeams: tt.subTeams || [] });
      if (tt.showName) teamTypeMap.set(tt.showName, { department: tt.department, subTeams: tt.subTeams || [] });
    }

    // Determine user's assigned departments if user is report_manager or hod
    const userDepts = new Map(
      user.departments?.map((d: any) => [typeof d === "string" ? d : d.name, new Set(d.subTeams ?? [])]) ?? []
    );

    const eligibleTeamLeads: Array<{
      userId: string;
      name: string;
      teamName: string;
      department: string;
      departments: string[];
    }> = [];

    for (const m of teamLeadMembers) {
      if (!m.user || m.user.isDeleted) continue;

      const userTeams = [m.teamName, ...(m.teamNames || [])].filter(Boolean) as string[];
      const effectiveDepts: Array<{ name: string; subTeams?: string[] }> = (m.departments || []).map((d: any) => ({
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

      // Check if team lead belongs to report manager's or HOD's assigned departments
      if ((user.role === "report_manager" || user.role === "hod") && userDepts.size > 0) {
        const isAllowed = effectiveDepts.some((dept) => {
          if (!userDepts.has(dept.name)) return false;
          const allowedSubTeams = userDepts.get(dept.name)!;
          if (allowedSubTeams.size === 0) return true;
          if (!dept.subTeams || dept.subTeams.length === 0) return true;
          return dept.subTeams.some((sub) => allowedSubTeams.has(sub));
        });

        if (!isAllowed) {
          continue;
        }
      }

      const leadDepts = Array.from(new Set(effectiveDepts.map((d) => d.name).filter(Boolean)));
      const primaryDept = effectiveDepts[0]?.name || m.teamName || "General";
      const primaryTeam = m.teamName || (m.teamNames && m.teamNames[0]) || primaryDept;

      eligibleTeamLeads.push({
        userId: String(m.userId),
        name: m.user.name || "Unknown Team Lead",
        teamName: primaryTeam,
        department: primaryDept,
        departments: leadDepts
      });
    }

    // Deduplicate by userId
    const uniqueTeamLeadsMap = new Map<string, typeof eligibleTeamLeads[0]>();
    for (const tl of eligibleTeamLeads) {
      if (!uniqueTeamLeadsMap.has(tl.userId)) {
        uniqueTeamLeadsMap.set(tl.userId, tl);
      }
    }
    const teamLeads = Array.from(uniqueTeamLeadsMap.values());

    // Fetch today's reports for these team leads with all relations
    const teamLeadUserIds = teamLeads.map((tl) => tl.userId);

    const reports = teamLeadUserIds.length > 0 ? await db.dailyReport.findMany({
      where: {
        employeeId: { in: teamLeadUserIds },
        ...(workspaceId && workspaceId !== "all" ? { workspaceId } : {})
      },
      include: reportRelationsInclude,
      orderBy: { createdAt: "desc" }
    }) : [];

    // Filter only reports that belong to today / targetDate
    const todayReportsMap = new Map<string, any>();
    for (const report of reports) {
      if (isReportDateToday(report.reportDate, targetDate)) {
        if (!todayReportsMap.has(String(report.employeeId))) {
          todayReportsMap.set(String(report.employeeId), mapReportRelations(report));
        }
      }
    }

    // Also fetch Finance reports for Finance Team Leads
    const financeReports = teamLeadUserIds.length > 0 ? await db.financeReport.findMany({
      where: {
        submittedBy: { in: teamLeadUserIds },
        ...(workspaceId && workspaceId !== "all" ? { workspaceId } : {})
      },
      include: {
        items: true,
        bankBalances: true
      },
      orderBy: { reportDate: "desc" }
    }) : [];

    for (const fReport of financeReports) {
      if (isReportDateToday(fReport.reportDate, targetDate)) {
        const submitterId = String(fReport.submittedBy);
        if (!todayReportsMap.has(submitterId)) {
          const items = fReport.items || [];
          const totalReceipts = items
            .filter((i: any) => i.type === "receipt" && i.particulars !== "Bank to Cash" && !i.revisionReference?.startsWith("link_cash_") && i.paymentMode !== "transfer_to_cash")
            .reduce((sum: number, i: any) => sum + (Number(i.amountINR) || 0), 0);
          const totalExpenses = items
            .filter((i: any) => i.type === "expense" || i.type === "payment")
            .reduce((sum: number, i: any) => sum + (Number(i.amountINR) || 0), 0);
          const bankBalance = (fReport.bankBalances || []).reduce((sum: number, b: any) => sum + (Number(b.closingBalance) || 0), 0);

          const summaryLines: string[] = [];
          if (fReport.description && fReport.description.trim()) {
            summaryLines.push(fReport.description.trim());
          }
          summaryLines.push(`Total Receipts: ₹${totalReceipts.toLocaleString("en-IN")}`);
          summaryLines.push(`Total Expenses: ₹${totalExpenses.toLocaleString("en-IN")}`);
          summaryLines.push(`Closing Balance: ₹${bankBalance.toLocaleString("en-IN")}`);

          const expenseItems = items.filter((i: any) => i.type === "expense" || i.type === "payment");
          if (expenseItems.length > 0) {
            summaryLines.push("\nExpenses / Payments:");
            for (const item of expenseItems) {
              summaryLines.push(`• ${item.particulars || "Expense"}: ₹${(Number(item.amountINR) || 0).toLocaleString("en-IN")}${item.description ? ` (${item.description})` : ""}`);
            }
          }

          const receiptItems = items.filter((i: any) => i.type === "receipt" && i.particulars !== "Bank to Cash" && !i.revisionReference?.startsWith("link_cash_") && i.paymentMode !== "transfer_to_cash");
          if (receiptItems.length > 0) {
            summaryLines.push("\nReceipts / Income:");
            for (const item of receiptItems) {
              summaryLines.push(`• ${item.particulars || "Receipt"}: ₹${(Number(item.amountINR) || 0).toLocaleString("en-IN")}${item.description ? ` (${item.description})` : ""}`);
            }
          }

          todayReportsMap.set(submitterId, {
            id: String(fReport.id),
            reportDate: fReport.reportDate,
            completedWork: summaryLines.join("\n"),
            pendingWork: "",
            blockers: "",
            requiredClarification: "",
            attachmentLink: `/finance/${fReport.id}`,
            dailyMeetingUpdate: "",
            status: fReport.status || "submitted",
            reportManagerStatus: fReport.status === "approved" ? "approved" : fReport.status === "rejected" ? "rejected" : null,
            reportManagerReview: fReport.rejectionReason || null,
            reportManagerReviewedByName: fReport.approvedByName || fReport.forwardedByName || null,
            reportManagerReviewedAt: fReport.approvedAt || fReport.forwardedAt || null,
            constructionWorkPlan: [],
            constructionMaterialUtilization: [],
            constructionTomorrowWorkPlan: [],
            marketingSelfItems: [],
            marketingClientItems: [],
            nextDayApprovalItems: []
          });
        }
      }
    }

    const data = teamLeads.map((tl) => {
      const todayReport = todayReportsMap.get(tl.userId) || null;
      return {
        id: tl.userId,
        name: tl.name,
        teamName: formatDisplayName(tl.teamName),
        department: tl.department,
        departments: tl.departments,
        todayReport: todayReport
          ? {
              id: String(todayReport.id),
              reportDate: todayReport.reportDate,
              completedWork: todayReport.completedWork || "",
              pendingWork: todayReport.pendingWork || "",
              blockers: todayReport.blockers || "",
              requiredClarification: todayReport.requiredClarification || "",
              attachmentLink: todayReport.attachmentLink || null,
              dailyMeetingUpdate: todayReport.dailyMeetingUpdate || "",
              status: todayReport.status || "submitted",
              reportManagerStatus: todayReport.reportManagerStatus || null,
              reportManagerReview: todayReport.reportManagerReview || null,
              reportManagerReviewedByName: todayReport.reportManagerReviewedByName || null,
              reportManagerReviewedAt: todayReport.reportManagerReviewedAt || null,
              constructionWorkPlan: todayReport.constructionWorkPlan || [],
              constructionMaterialUtilization: todayReport.constructionMaterialUtilization || [],
              constructionTomorrowWorkPlan: todayReport.constructionTomorrowWorkPlan || [],
              marketingSelfItems: todayReport.marketingSelfItems || [],
              marketingClientItems: todayReport.marketingClientItems || [],
              nextDayApprovalItems: todayReport.nextDayApprovalItems || []
            }
          : null
      };
    });

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error("Error fetching team leads for report manager:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
