import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  default: {
    dailyReport: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn()
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn()
    },
    workspaceMember: {
      findMany: vi.fn(),
      findFirst: vi.fn()
    },
    workspace: {
      findUnique: vi.fn(),
      findMany: vi.fn()
    },
    notification: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn()
    }
  }
}));
import db from "@/lib/db";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn()
}));
import { getCurrentUser } from "@/lib/auth";

vi.mock("@/lib/audit", () => ({
  logAuditEntry: vi.fn().mockResolvedValue({})
}));

vi.mock("@/lib/report-visibility", () => ({
  getVisibleReportEmployeeIds: vi.fn()
}));
import { getVisibleReportEmployeeIds } from "@/lib/report-visibility";

import { PATCH as grantEditAccess } from "@/app/api/report-manager/reports/[id]/edit-access/route";
import { POST as approveEditRequest } from "@/app/api/reports/[id]/approve-edit/route";
import { POST as requestEditAccess } from "@/app/api/reports/[id]/edit-request/route";
import { notifyReportEditAccessApproved } from "@/lib/notifications";

describe("Report Edit Access Request & Approval Notification Flow", () => {
  const companyAId = "ws-company-a";
  const companyBId = "ws-company-b";

  const thusneemUser = {
    id: "user-thusneem",
    name: "Thusneem",
    email: "thusneem@company-a.com",
    role: "team_member",
    workspaceId: companyAId,
    status: "active"
  };

  const teamLeadUser = {
    id: "user-team-lead",
    name: "Team Lead Ahmed",
    email: "lead@company-a.com",
    role: "team_lead",
    workspaceId: companyAId,
    status: "active"
  };

  const foreignUser = {
    id: "user-foreign",
    name: "Foreign User",
    email: "foreign@company-b.com",
    role: "team_lead",
    workspaceId: companyBId,
    status: "active"
  };

  const khanReportManager = {
    id: "user-rm-khan",
    name: "Khan",
    email: "khan@company-a.com",
    role: "report_manager",
    workspaceId: companyAId,
    status: "active"
  };

  const foreignReportManager = {
    id: "user-rm-foreign",
    name: "Foreign RM",
    email: "foreign-rm@company-b.com",
    role: "report_manager",
    workspaceId: companyBId,
    status: "active"
  };

  const mockReport = {
    id: "report-thusneem-1",
    employeeId: thusneemUser.id,
    name: "Thusneem",
    teamName: "Civil",
    reportType: "Daily Report",
    reportDate: new Date(),
    workspaceId: companyAId,
    status: "submitted",
    isLocked: false,
    editAccessRequested: true,
    editAccessRequestReason: "Need to update blocker tasks",
    editAccessGranted: false
  };

  const tlAhmedReport = {
    id: "report-tl-ahmed-1",
    employeeId: teamLeadUser.id,
    name: "Team Lead Ahmed",
    teamName: "Civil",
    reportType: "Daily Report",
    reportDate: new Date(),
    workspaceId: companyAId,
    status: "submitted",
    isLocked: false,
    editAccessRequested: true,
    editAccessRequestReason: "Need to update material numbers",
    editAccessGranted: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (db.notification.findFirst as any).mockResolvedValue(null);
    (db.notification.findMany as any).mockResolvedValue([]);
  });

  describe("Scenario A: Team Member submits edit request -> Team Lead receives notification", () => {
    it("creates 'edit_request_pending' notification for the Team Lead when Thusneem requests edit access", async () => {
      (getCurrentUser as any).mockResolvedValue(thusneemUser);
      (db.dailyReport.findUnique as any).mockResolvedValue({
        ...mockReport,
        editAccessRequested: false,
        editAccessGranted: false
      });
      (db.dailyReport.update as any).mockResolvedValue({
        ...mockReport,
        editAccessRequested: true
      });

      // Thusneem's membership links to Team Lead Ahmed as manager
      (db.workspaceMember.findMany as any).mockImplementation(async (query: any) => {
        if (query.where?.userId === thusneemUser.id) {
          return [
            {
              userId: thusneemUser.id,
              teamName: "Civil",
              teamNames: ["Civil"],
              managerName: "Team Lead Ahmed",
              departments: [{ name: "Operations" }]
            }
          ];
        }
        if (query.where?.role === "team_lead") {
          return [{ userId: teamLeadUser.id, role: "team_lead" }];
        }
        return [];
      });

      const req = new Request(`http://localhost:3000/api/reports/${mockReport.id}/edit-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Need to update blocker tasks" })
      });

      const res = await requestEditAccess(req, { params: Promise.resolve({ id: mockReport.id }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      // Verify Team Lead received the request notification
      expect(db.notification.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            recipientId: teamLeadUser.id,
            type: "edit_request_pending",
            title: "New Edit Request",
            message: expect.stringContaining("Thusneem has requested to edit")
          })
        ])
      });
    });
  });

  describe("Scenario A2: Team Lead submits edit request -> Report Manager (Khan) receives notification", () => {
    it("creates 'edit_request_pending' notification for Report Manager Khan when Team Lead Ahmed requests edit access", async () => {
      (getCurrentUser as any).mockResolvedValue(teamLeadUser);
      (db.dailyReport.findUnique as any).mockResolvedValue({
        ...tlAhmedReport,
        editAccessRequested: false,
        editAccessGranted: false
      });
      (db.dailyReport.update as any).mockResolvedValue({
        ...tlAhmedReport,
        editAccessRequested: true
      });

      // Team Lead Ahmed has team "Civil"
      (db.workspaceMember.findMany as any).mockImplementation(async (query: any) => {
        if (query.where?.userId === teamLeadUser.id) {
          return [
            {
              userId: teamLeadUser.id,
              role: "team_lead",
              teamName: "Civil",
              teamNames: ["Civil"],
              managerName: "",
              departments: []
            }
          ];
        }
        if (query.where?.role === "report_manager") {
          // Khan is report manager in Company A for Operations (which contains Civil) or has matching depts
          return [
            {
              userId: khanReportManager.id,
              role: "report_manager",
              workspaceId: companyAId,
              departments: [{ name: "Civil", subTeams: ["Civil"] }],
              user: { name: "Khan" }
            }
          ];
        }
        return [];
      });

      const req = new Request(`http://localhost:3000/api/reports/${tlAhmedReport.id}/edit-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Need to update material numbers" })
      });

      const res = await requestEditAccess(req, { params: Promise.resolve({ id: tlAhmedReport.id }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      // Verify Report Manager Khan received the notification
      expect(db.notification.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            recipientId: khanReportManager.id,
            type: "edit_request_pending",
            title: "New Edit Request",
            message: expect.stringContaining("Team Lead Ahmed has requested to edit their Daily Report"),
            linkUrl: "/reports?employee=Team%20Lead%20Ahmed"
          })
        ])
      });
    });

    it("prevents self-notification if Report Manager is also author", async () => {
      (getCurrentUser as any).mockResolvedValue(khanReportManager);
      const rmReport = {
        ...mockReport,
        employeeId: khanReportManager.id,
        name: "Khan",
        editAccessRequested: false,
        editAccessGranted: false
      };
      (db.dailyReport.findUnique as any).mockResolvedValue(rmReport);
      (db.dailyReport.update as any).mockResolvedValue({
        ...rmReport,
        editAccessRequested: true
      });

      // No other managers in company
      (db.workspaceMember.findMany as any).mockImplementation(async (query: any) => {
        if (query.where?.userId === khanReportManager.id) {
          return [
            {
              userId: khanReportManager.id,
              role: "report_manager",
              departments: [{ name: "Operations" }]
            }
          ];
        }
        return [];
      });

      const req = new Request(`http://localhost:3000/api/reports/${rmReport.id}/edit-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Update remarks" })
      });

      const res = await requestEditAccess(req, { params: Promise.resolve({ id: rmReport.id }) });
      expect(res.status).toBe(200);

      // Khan is excluded from receiving his own notification
      if ((db.notification.createMany as any).mock.calls.length > 0) {
        const payload = (db.notification.createMany as any).mock.calls[0][0];
        const recipients = payload.data.map((d: any) => d.recipientId);
        expect(recipients).not.toContain(khanReportManager.id);
      }
    });
  });

  describe("Scenario B: Team Lead grants edit access -> Thusneem receives 'Edit Request Approved' notification", () => {
    it("via PATCH /api/report-manager/reports/[id]/edit-access: notifies Thusneem when Team Lead clicks 'Allow Edit Access'", async () => {
      (getCurrentUser as any).mockResolvedValue(teamLeadUser);
      (db.dailyReport.findUnique as any).mockResolvedValue(mockReport);
      (getVisibleReportEmployeeIds as any).mockResolvedValue([thusneemUser.id]);
      (db.notification.findFirst as any).mockResolvedValue(null); // No previous unread notif
      (db.dailyReport.update as any).mockResolvedValue({
        ...mockReport,
        editAccessGranted: true,
        editAccessRequested: false
      });

      const req = new Request(`http://localhost:3000/api/report-manager/reports/${mockReport.id}/edit-access`, {
        method: "PATCH"
      });

      const res = await grantEditAccess(req, { params: Promise.resolve({ id: mockReport.id }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      // Verify notification was created for Thusneem
      expect(db.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          recipientId: thusneemUser.id,
          type: "edit_request_approved",
          title: "Edit Request Approved",
          message: expect.stringContaining("Team Lead Ahmed approved your request to edit the Daily Report"),
          linkUrl: "/daily-report/my-reports"
        })
      });
    });

    it("via POST /api/reports/[id]/approve-edit: notifies Thusneem on approval", async () => {
      (getCurrentUser as any).mockResolvedValue(teamLeadUser);
      (db.dailyReport.findUnique as any).mockResolvedValue(mockReport);
      (getVisibleReportEmployeeIds as any).mockResolvedValue([thusneemUser.id]);
      (db.user.findUnique as any).mockResolvedValue({ role: "team_member" });
      (db.notification.findFirst as any).mockResolvedValue(null);
      (db.dailyReport.update as any).mockResolvedValue({
        ...mockReport,
        editAccessGranted: true,
        editAccessRequested: false
      });

      const req = new Request(`http://localhost:3000/api/reports/${mockReport.id}/approve-edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approve: true })
      });

      const res = await approveEditRequest(req, { params: Promise.resolve({ id: mockReport.id }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      expect(db.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          recipientId: thusneemUser.id,
          type: "edit_request_approved",
          title: "Edit Request Approved"
        })
      });
    });
  });

  describe("Scenario C: Recipient is strictly the report author (Thusneem), NOT the Team Lead", () => {
    it("does NOT dispatch notification to the approver (Team Lead)", async () => {
      (getCurrentUser as any).mockResolvedValue(teamLeadUser);
      (db.dailyReport.findUnique as any).mockResolvedValue(mockReport);
      (getVisibleReportEmployeeIds as any).mockResolvedValue([thusneemUser.id]);
      (db.notification.findFirst as any).mockResolvedValue(null);

      const req = new Request(`http://localhost:3000/api/report-manager/reports/${mockReport.id}/edit-access`, {
        method: "PATCH"
      });

      await grantEditAccess(req, { params: Promise.resolve({ id: mockReport.id }) });

      // Verify recipient was Thusneem and NEVER the Team Lead
      const createdCall = (db.notification.create as any).mock.calls[0][0];
      expect(createdCall.data.recipientId).toBe(thusneemUser.id);
      expect(createdCall.data.recipientId).not.toBe(teamLeadUser.id);
    });

    it("helper notifyReportEditAccessApproved safely ignores if author is the approver (self-approval edge case)", async () => {
      await notifyReportEditAccessApproved({
        report: {
          id: "rep-self",
          employeeId: teamLeadUser.id,
          reportDate: new Date(),
          workspaceId: companyAId
        },
        approver: {
          id: teamLeadUser.id,
          name: teamLeadUser.name
        }
      });

      expect(db.notification.create).not.toHaveBeenCalled();
    });
  });

  describe("Scenario D: Notification metadata & linkUrl structure", () => {
    it("contains linkUrl pointing to /daily-report/my-reports and metadata with report details", async () => {
      (getCurrentUser as any).mockResolvedValue(teamLeadUser);
      (db.dailyReport.findUnique as any).mockResolvedValue(mockReport);
      (getVisibleReportEmployeeIds as any).mockResolvedValue([thusneemUser.id]);
      (db.notification.findFirst as any).mockResolvedValue(null);

      const req = new Request(`http://localhost:3000/api/report-manager/reports/${mockReport.id}/edit-access`, {
        method: "PATCH"
      });

      await grantEditAccess(req, { params: Promise.resolve({ id: mockReport.id }) });

      const createdCall = (db.notification.create as any).mock.calls[0][0];
      expect(createdCall.data.linkUrl).toBe("/daily-report/my-reports");
      expect(createdCall.data.metadata).toMatchObject({
        reportId: mockReport.id,
        approvedBy: teamLeadUser.name,
        approvedById: teamLeadUser.id,
        workspaceId: companyAId
      });
    });
  });

  describe("Scenario E: Failed edit-access approval does NOT create notification", () => {
    it("does not create notification when report is locked (HTTP 423)", async () => {
      (getCurrentUser as any).mockResolvedValue(teamLeadUser);
      (db.dailyReport.findUnique as any).mockResolvedValue({
        ...mockReport,
        isLocked: true
      });
      (getVisibleReportEmployeeIds as any).mockResolvedValue([thusneemUser.id]);

      const req = new Request(`http://localhost:3000/api/report-manager/reports/${mockReport.id}/edit-access`, {
        method: "PATCH"
      });

      const res = await grantEditAccess(req, { params: Promise.resolve({ id: mockReport.id }) });
      expect(res.status).toBe(423);
      expect(db.notification.create).not.toHaveBeenCalled();
    });

    it("does not create notification when report is not found (HTTP 404)", async () => {
      (getCurrentUser as any).mockResolvedValue(teamLeadUser);
      (db.dailyReport.findUnique as any).mockResolvedValue(null);

      const req = new Request(`http://localhost:3000/api/report-manager/reports/non-existent/edit-access`, {
        method: "PATCH"
      });

      const res = await grantEditAccess(req, { params: Promise.resolve({ id: "non-existent" }) });
      expect(res.status).toBe(404);
      expect(db.notification.create).not.toHaveBeenCalled();
    });
  });

  describe("Scenario F: Idempotency & duplicate prevention on API retries", () => {
    it("does not insert duplicate unread notifications if approval is retried", async () => {
      (getCurrentUser as any).mockResolvedValue(teamLeadUser);
      (db.dailyReport.findUnique as any).mockResolvedValue(mockReport);
      (getVisibleReportEmployeeIds as any).mockResolvedValue([thusneemUser.id]);

      // Simulate existing unread notification for Thusneem on this report
      (db.notification.findFirst as any).mockResolvedValue({
        id: "notif-already-existing",
        recipientId: thusneemUser.id,
        type: "edit_request_approved",
        isRead: false
      });

      const req = new Request(`http://localhost:3000/api/report-manager/reports/${mockReport.id}/edit-access`, {
        method: "PATCH"
      });

      const res = await grantEditAccess(req, { params: Promise.resolve({ id: mockReport.id }) });
      expect(res.status).toBe(200);

      // Verify db.notification.create was skipped due to existing unread notif
      expect(db.notification.create).not.toHaveBeenCalled();
    });
  });

  describe("Scenario G: Cross-company security isolation", () => {
    it("blocks foreign company user from granting edit access (HTTP 404/403) and sends no notification", async () => {
      (getCurrentUser as any).mockResolvedValue(foreignUser);
      (db.dailyReport.findUnique as any).mockResolvedValue(mockReport);
      // Foreign user cannot see Thusneem's employee ID
      (getVisibleReportEmployeeIds as any).mockResolvedValue(["some-other-employee"]);

      const req = new Request(`http://localhost:3000/api/report-manager/reports/${mockReport.id}/edit-access`, {
        method: "PATCH"
      });

      const res = await grantEditAccess(req, { params: Promise.resolve({ id: mockReport.id }) });
      expect(res.status).toBe(404);
      expect(db.notification.create).not.toHaveBeenCalled();
    });

    it("ensures edit request notification is strictly scoped to the report's company workspace", async () => {
      (getCurrentUser as any).mockResolvedValue(teamLeadUser);
      (db.dailyReport.findUnique as any).mockResolvedValue({
        ...tlAhmedReport,
        editAccessRequested: false,
        editAccessGranted: false
      });
      (db.dailyReport.update as any).mockResolvedValue({
        ...tlAhmedReport,
        editAccessRequested: true
      });

      // Query only matches members within companyAId
      (db.workspaceMember.findMany as any).mockImplementation(async (query: any) => {
        if (query.where?.userId === teamLeadUser.id) {
          return [
            {
              userId: teamLeadUser.id,
              role: "team_lead",
              workspaceId: companyAId,
              teamName: "Civil",
              departments: []
            }
          ];
        }
        if (query.where?.role === "report_manager") {
          // If query scopes to companyAId, return Khan; if foreign, return foreign RM
          if (query.where?.workspaceId === companyAId) {
            return [
              {
                userId: khanReportManager.id,
                role: "report_manager",
                workspaceId: companyAId,
                departments: [{ name: "Civil", subTeams: ["Civil"] }]
              }
            ];
          }
          if (query.where?.workspaceId === companyBId) {
            return [
              {
                userId: foreignReportManager.id,
                role: "report_manager",
                workspaceId: companyBId,
                departments: [{ name: "Civil", subTeams: ["Civil"] }]
              }
            ];
          }
        }
        return [];
      });

      const req = new Request(`http://localhost:3000/api/reports/${tlAhmedReport.id}/edit-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Material changes" })
      });

      const res = await requestEditAccess(req, { params: Promise.resolve({ id: tlAhmedReport.id }) });
      expect(res.status).toBe(200);

      // Verify Khan received the notification and Foreign RM in Company B did NOT
      const calls = (db.notification.createMany as any).mock.calls;
      const createdNotifs = calls[calls.length - 1][0].data;
      const recipientIds = createdNotifs.map((n: any) => n.recipientId);
      expect(recipientIds).toContain(khanReportManager.id);
      expect(recipientIds).not.toContain(foreignReportManager.id);
    });
  });
});
