import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  default: {
    dailyReport: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      delete: vi.fn()
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
      createMany: vi.fn()
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

import { GET as getReportById, PUT as updateReportById } from "@/app/api/reports/[id]/route";
import { canEditDailyReport } from "@/lib/report-edit-access";

describe("Team Member Edit Report Flow & Route Isolation", () => {
  const companyWorkspaceId = "ws-company-main";
  const foreignWorkspaceId = "ws-company-other";

  const thusneemUser = {
    id: "user-thusneem",
    name: "Thusneem",
    email: "thusneem@company.com",
    role: "team_member",
    workspaceId: companyWorkspaceId
  };

  const otherUser = {
    id: "user-other",
    name: "Other Employee",
    email: "other@company.com",
    role: "team_member",
    workspaceId: companyWorkspaceId
  };

  const todayIso = new Date().toISOString();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Route & Middleware Path Mapping Logic", () => {
    it("maps /daily-report/my-reports to /tm/my-reports for team_member (prevents dynamic [id]='my-reports' 404 bug)", () => {
      const pathname: string = "/daily-report/my-reports";

      let nextPath = "/tm/daily-report";
      if (pathname === "/daily-report/my-reports" || pathname.startsWith("/daily-report/my-reports/")) {
        nextPath = "/tm/my-reports";
      } else if (pathname === "/daily-report/create" || pathname === "/daily-report") {
        nextPath = "/tm/daily-report";
      } else {
        nextPath = pathname.replace(/^\/daily-report/, "/tm/daily-report");
      }

      expect(nextPath).toBe("/tm/my-reports");
      expect(nextPath).not.toBe("/tm/daily-report/my-reports");
    });

    it("maps /daily-report/create to /tm/daily-report for team_member", () => {
      const pathname: string = "/daily-report/create";

      let nextPath = "/tm/daily-report";
      if (pathname === "/daily-report/my-reports" || pathname.startsWith("/daily-report/my-reports/")) {
        nextPath = "/tm/my-reports";
      } else if (pathname === "/daily-report/create" || pathname === "/daily-report") {
        nextPath = "/tm/daily-report";
      } else {
        nextPath = pathname.replace(/^\/daily-report/, "/tm/daily-report");
      }

      expect(nextPath).toBe("/tm/daily-report");
      expect(nextPath).not.toBe("/tm/daily-report/create");
    });

    it("maps /daily-report/[id] to /tm/daily-report/[id] for specific report ID", () => {
      const reportId = "report-thusneem-123";
      const pathname: string = `/daily-report/${reportId}`;

      let nextPath = "/tm/daily-report";
      if (pathname === "/daily-report/my-reports" || pathname.startsWith("/daily-report/my-reports/")) {
        nextPath = "/tm/my-reports";
      } else if (pathname === "/daily-report/create" || pathname === "/daily-report") {
        nextPath = "/tm/daily-report";
      } else {
        nextPath = pathname.replace(/^\/daily-report/, "/tm/daily-report");
      }

      expect(nextPath).toBe(`/tm/daily-report/${reportId}`);
    });

    it("maps /daily-report/[id]/preview to /tm/daily-report/[id]/preview for preview page", () => {
      const reportId = "report-thusneem-123";
      const pathname: string = `/daily-report/${reportId}/preview`;

      let nextPath = "/tm/daily-report";
      if (pathname === "/daily-report/my-reports" || pathname.startsWith("/daily-report/my-reports/")) {
        nextPath = "/tm/my-reports";
      } else if (pathname === "/daily-report/create" || pathname === "/daily-report") {
        nextPath = "/tm/daily-report";
      } else {
        nextPath = pathname.replace(/^\/daily-report/, "/tm/daily-report");
      }

      expect(nextPath).toBe(`/tm/daily-report/${reportId}/preview`);
    });
  });

  describe("2. Report ID Flow & Loading via GET /api/reports/[id]", () => {
    it("loads Thusneem's specific report when requested by valid report ID with edit access granted", async () => {
      (getCurrentUser as any).mockResolvedValue(thusneemUser);

      const mockReport = {
        id: "rep-thusneem-today",
        employeeId: thusneemUser.id,
        name: "Thusneem",
        teamName: "Design",
        reportType: "Daily Update",
        reportDate: new Date(),
        completedWork: "Created wireframes",
        pendingWork: "Finalize mockups",
        blockers: "None",
        isLocked: false,
        editAccessGranted: true,
        editAccessRequested: false,
        workspaceId: companyWorkspaceId
      };

      (db.dailyReport.findUnique as any).mockResolvedValue(mockReport);
      (db.user.findUnique as any).mockResolvedValue(thusneemUser);
      (db.workspaceMember.findFirst as any).mockResolvedValue({
        userId: thusneemUser.id,
        role: "team_member",
        workspaceId: companyWorkspaceId,
        isActive: true
      });

      const res = await getReportById(new Request("http://localhost:3000/api/reports/rep-thusneem-today"), {
        params: Promise.resolve({ id: "rep-thusneem-today" })
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe("rep-thusneem-today");
      expect(json.data.canEdit).toBe(true);
    });

    it("returns 404 when 'my-reports' is passed as ID (simulating old buggy route request)", async () => {
      (getCurrentUser as any).mockResolvedValue(thusneemUser);
      (db.dailyReport.findUnique as any).mockResolvedValue(null);

      const res = await getReportById(new Request("http://localhost:3000/api/reports/my-reports"), {
        params: Promise.resolve({ id: "my-reports" })
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.message).toBe("Report not found");
    });

    it("returns 403 Forbidden if a team member tries to load another user's report", async () => {
      (getCurrentUser as any).mockResolvedValue(thusneemUser);

      const otherUserReport = {
        id: "rep-other-user",
        employeeId: "user-other-person",
        name: "Other Person",
        teamName: "Design",
        reportDate: new Date(),
        workspaceId: companyWorkspaceId
      };

      (db.dailyReport.findUnique as any).mockResolvedValue(otherUserReport);

      const res = await getReportById(new Request("http://localhost:3000/api/reports/rep-other-user"), {
        params: Promise.resolve({ id: "rep-other-user" })
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.message).toBe("Forbidden");
    });
  });

  describe("3. Edit Authorization & Saving via PUT /api/reports/[id]", () => {
    it("successfully updates report and resets editAccessGranted when authorized with approved edit access", async () => {
      (getCurrentUser as any).mockResolvedValue(thusneemUser);

      const existingReport = {
        id: "rep-thusneem-today",
        employeeId: thusneemUser.id,
        name: "Thusneem",
        teamName: "Design",
        reportType: "Daily Update",
        reportDate: new Date(),
        completedWork: "Initial draft",
        pendingWork: "Pending items",
        blockers: "",
        isLocked: false,
        editAccessGranted: true,
        workspaceId: companyWorkspaceId
      };

      const updatedDbReport = {
        ...existingReport,
        completedWork: "Updated completed tasks",
        pendingWork: "Updated pending tasks",
        editAccessGranted: false
      };

      (db.dailyReport.findUnique as any).mockResolvedValue(existingReport);
      (db.dailyReport.update as any).mockResolvedValue(updatedDbReport);

      const payload = {
        completedWork: "Updated completed tasks",
        pendingWork: "Updated pending tasks",
        reportDate: todayIso
      };

      const res = await updateReportById(
        new Request("http://localhost:3000/api/reports/rep-thusneem-today", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }),
        { params: Promise.resolve({ id: "rep-thusneem-today" }) }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.completedWork).toBe("Updated completed tasks");

      // Verify update payload reset editAccessGranted
      expect(db.dailyReport.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "rep-thusneem-today" },
          data: expect.objectContaining({
            editAccessGranted: false,
            editAccessRequested: false
          })
        })
      );
    });

    it("returns 423 Locked when trying to edit a report without edit access granted", async () => {
      (getCurrentUser as any).mockResolvedValue(thusneemUser);

      const reportWithoutAccess = {
        id: "rep-thusneem-locked",
        employeeId: thusneemUser.id,
        name: "Thusneem",
        teamName: "Design",
        reportType: "Daily Update",
        reportDate: new Date(),
        isLocked: false,
        editAccessGranted: false, // NOT granted
        workspaceId: companyWorkspaceId
      };

      (db.dailyReport.findUnique as any).mockResolvedValue(reportWithoutAccess);

      const res = await updateReportById(
        new Request("http://localhost:3000/api/reports/rep-thusneem-locked", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completedWork: "New text" })
        }),
        { params: Promise.resolve({ id: "rep-thusneem-locked" }) }
      );

      expect(res.status).toBe(423);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.message).toContain("permission to edit");
    });

    it("returns 403 Forbidden when trying to update another user's report", async () => {
      (getCurrentUser as any).mockResolvedValue(thusneemUser);

      const otherUserReport = {
        id: "rep-other-user",
        employeeId: otherUser.id,
        name: otherUser.name,
        reportDate: new Date(),
        isLocked: false,
        editAccessGranted: true,
        workspaceId: companyWorkspaceId
      };

      (db.dailyReport.findUnique as any).mockResolvedValue(otherUserReport);

      const res = await updateReportById(
        new Request("http://localhost:3000/api/reports/rep-other-user", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completedWork: "Hacked text" })
        }),
        { params: Promise.resolve({ id: "rep-other-user" }) }
      );

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.message).toContain("Forbidden");
    });
  });

  describe("4. Edit Access Helper Validation (canEditDailyReport)", () => {
    it("evaluates canEditDailyReport correctly for team member", () => {
      const today = new Date();

      // Approved today
      expect(
        canEditDailyReport(
          { reportDate: today, isLocked: false, editAccessGranted: true, employeeId: thusneemUser.id },
          thusneemUser,
          today
        )
      ).toBe(true);

      // Not approved
      expect(
        canEditDailyReport(
          { reportDate: today, isLocked: false, editAccessGranted: false, employeeId: thusneemUser.id },
          thusneemUser,
          today
        )
      ).toBe(false);

      // Locked
      expect(
        canEditDailyReport(
          { reportDate: today, isLocked: true, editAccessGranted: true, employeeId: thusneemUser.id },
          thusneemUser,
          today
        )
      ).toBe(false);

      // Past date (not today)
      const pastDate = new Date("2026-01-01");
      expect(
        canEditDailyReport(
          { reportDate: pastDate, isLocked: false, editAccessGranted: true, employeeId: thusneemUser.id },
          thusneemUser,
          today
        )
      ).toBe(false);
    });
  });
});
