import { describe, it, expect } from "vitest";
import { isReportDateToday, canEditDailyReport } from "./report-edit-access";

describe("Report Edit & Lock Access Rights", () => {
  const now = new Date("2026-08-06T12:00:00.000Z");
  const todayStr = "2026-08-06";
  const yesterdayStr = "2026-08-05";

  describe("isReportDateToday", () => {
    it("returns true for matching date key in target timezone", () => {
      expect(isReportDateToday(todayStr, now)).toBe(true);
      expect(isReportDateToday(new Date("2026-08-06T08:00:00.000Z"), now)).toBe(true);
    });

    it("returns false for non-matching dates or past reports", () => {
      expect(isReportDateToday(yesterdayStr, now)).toBe(false);
      expect(isReportDateToday("2026-08-07", now)).toBe(false);
    });

    it("handles null, undefined, or invalid date strings safely", () => {
      expect(isReportDateToday(null, now)).toBe(false);
      expect(isReportDateToday(undefined, now)).toBe(false);
      expect(isReportDateToday("not-a-date-string", now)).toBe(false);
    });
  });

  describe("canEditDailyReport role boundaries and lock checks", () => {
    it("denies edit access immediately when report is locked, regardless of role or date", () => {
      const lockedReport = { isLocked: true, reportDate: todayStr, editAccessGranted: true };
      expect(canEditDailyReport(lockedReport, { role: "team_lead" }, now)).toBe(false);
      expect(canEditDailyReport(lockedReport, { role: "team_member" }, now)).toBe(false);
    });

    it("denies edit access for CEO role across all reports", () => {
      const todayReport = { isLocked: false, reportDate: todayStr, editAccessGranted: true };
      expect(canEditDailyReport(todayReport, { role: "ceo" }, now)).toBe(false);
    });

    it("requires explicit editAccessGranted for team_member and team_lead on today's report", () => {
      const todayReportWithoutAccess = { isLocked: false, reportDate: todayStr, editAccessGranted: false };
      const todayReportWithAccess = { isLocked: false, reportDate: todayStr, editAccessGranted: true };

      expect(canEditDailyReport(todayReportWithoutAccess, { role: "team_member" }, now)).toBe(false);
      expect(canEditDailyReport(todayReportWithAccess, { role: "team_member" }, now)).toBe(true);

      expect(canEditDailyReport(todayReportWithoutAccess, { role: "team_lead" }, now)).toBe(false);
      expect(canEditDailyReport(todayReportWithAccess, { role: "team_lead" }, now)).toBe(true);
    });

    it("prevents any role from editing historical reports even if editAccessGranted was set", () => {
      const pastReportNoAccess = { isLocked: false, reportDate: yesterdayStr, editAccessGranted: false };
      const pastReportWithAccess = { isLocked: false, reportDate: yesterdayStr, editAccessGranted: true };

      expect(canEditDailyReport(pastReportNoAccess, { role: "team_lead" }, now)).toBe(false);
      expect(canEditDailyReport(pastReportWithAccess, { role: "team_lead" }, now)).toBe(false);
      expect(canEditDailyReport(pastReportNoAccess, { role: "team_member" }, now)).toBe(false);
      expect(canEditDailyReport(pastReportWithAccess, { role: "team_member" }, now)).toBe(false);
      expect(canEditDailyReport(pastReportWithAccess, { role: "hod", id: "hod-1" }, now)).toBe(false);
    });

    it("allows HOD to edit own report directly on today's date", () => {
      const todayHodReport = { isLocked: false, reportDate: todayStr, employeeId: "hod-1" };
      expect(canEditDailyReport(todayHodReport, { role: "hod", id: "hod-1" }, now)).toBe(true);
      expect(canEditDailyReport(todayHodReport, { role: "hod", id: "hod-2" }, now)).toBe(false);
    });

    it("allows administrative roles to edit when report date is today", () => {
      expect(canEditDailyReport({ isLocked: false, reportDate: todayStr }, { role: "admin" }, now)).toBe(true);
      expect(canEditDailyReport({ isLocked: false, reportDate: yesterdayStr, editAccessGranted: true }, { role: "admin" }, now)).toBe(false);
    });
  });
});
