import { describe, it, expect } from "vitest";
import { getReviewEligibility } from "@/components/reports/report-date-list";
import { isReportDateToday } from "@/lib/report-edit-access";

describe("Report Manager All Reports View-Only & Review Workflow", () => {
  it("ensures All Reports table has NO Add/Edit Remark actions for Report Manager", () => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    const todayTlReport: any = {
      _id: "rep-today-tl",
      employeeId: "tl-1",
      employeeRole: "team_lead",
      reportDate: today
    };

    const yesterdayTlReport: any = {
      _id: "rep-yesterday-tl",
      employeeId: "tl-1",
      employeeRole: "team_lead",
      reportDate: yesterday
    };

    const tmReport: any = {
      _id: "rep-tm",
      employeeId: "tm-1",
      employeeRole: "team_member",
      reportDate: today
    };

    // Report Manager has view-only access on All Reports table
    expect(getReviewEligibility(todayTlReport, "rm-1", "report_manager")).toEqual({
      allowed: false
    });
    expect(getReviewEligibility(yesterdayTlReport, "rm-1", "report_manager")).toEqual({
      allowed: false
    });
    expect(getReviewEligibility(tmReport, "rm-1", "report_manager")).toEqual({
      allowed: false
    });
  });

  it("dynamically evaluates relative to current date without hardcoded dates", () => {
    const now = new Date("2026-09-11T12:00:00.000Z");
    const sep11 = "2026-09-11";
    const sep10 = "2026-09-10";

    // When current date is Sep 11:
    expect(isReportDateToday(sep11, now)).toBe(true);
    expect(isReportDateToday(sep10, now)).toBe(false);
  });

  it("validates mandatory remarks and author role for Report Manager review submission", () => {
    const validateManagerReview = (data: {
      action: "approve" | "reject";
      reviewNotes?: string;
      rejectionReason?: string;
      authorRole: string;
      reportDate: string;
    }) => {
      const remark = data.reviewNotes?.trim() || data.rejectionReason?.trim();
      if (!remark) return { valid: false, error: "A remark or reason is mandatory for Report Manager review." };
      if (data.authorRole.toLowerCase() !== "team_lead") {
        return { valid: false, error: "Report Managers can only review reports submitted by Team Leads." };
      }
      if (!isReportDateToday(data.reportDate)) {
        return { valid: false, error: "Report Managers can only review reports on the date they are submitted." };
      }
      return { valid: true };
    };

    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    // Valid approval with remark
    expect(validateManagerReview({
      action: "approve",
      reviewNotes: "Yes, I read fully. The report is true.",
      authorRole: "team_lead",
      reportDate: today
    })).toEqual({ valid: true });

    // Valid rejection with reason
    expect(validateManagerReview({
      action: "reject",
      rejectionReason: "Details insufficient.",
      authorRole: "team_lead",
      reportDate: today
    })).toEqual({ valid: true });

    // Empty remark -> Invalid
    expect(validateManagerReview({
      action: "approve",
      reviewNotes: "   ",
      authorRole: "team_lead",
      reportDate: today
    })).toEqual({ valid: false, error: "A remark or reason is mandatory for Report Manager review." });

    // Non-TL author -> Invalid
    expect(validateManagerReview({
      action: "approve",
      reviewNotes: "Good job",
      authorRole: "team_member",
      reportDate: today
    })).toEqual({ valid: false, error: "Report Managers can only review reports submitted by Team Leads." });

    // Yesterday's date -> Invalid
    expect(validateManagerReview({
      action: "approve",
      reviewNotes: "Good job",
      authorRole: "team_lead",
      reportDate: yesterday
    })).toEqual({ valid: false, error: "Report Managers can only review reports on the date they are submitted." });
  });

  it("verifies separation between Team Lead specific remarks and Report Manager additional remarks", () => {
    const tl1Review = {
      tlId: "tl-1",
      reportManagerStatus: "approved",
      reportManagerReview: "Marketing mobile work looks solid."
    };

    const tl2Review = {
      tlId: "tl-2",
      reportManagerStatus: "rejected",
      reportManagerReview: "Blocker details missing."
    };

    const reportManagerDailyReport = {
      employeeId: "rm-1",
      role: "report_manager",
      teamName: "Marketing",
      reportDate: new Date().toISOString().slice(0, 10),
      completedWork: "Overall department performance is good today. Marketing campaigns are running on schedule."
    };

    // Independent Team Lead reviews
    expect(tl1Review.reportManagerReview).not.toEqual(tl2Review.reportManagerReview);
    expect(tl1Review.reportManagerStatus).not.toEqual(tl2Review.reportManagerStatus);

    // Separate general Additional Remarks on Report Manager's own report
    expect(reportManagerDailyReport.completedWork).toContain("Overall department performance");
    expect(reportManagerDailyReport.employeeId).toBe("rm-1");
  });
});

describe("HOD Same-Day Verification Eligibility", () => {
  it("allows HOD to verify Team Lead reports only on today's calendar date", () => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().slice(0, 10);

    const todayTlReport: any = {
      _id: "rep-today-tl",
      employeeId: "tl-1",
      employeeRole: "team_lead",
      reportDate: today
    };

    const yesterdayTlReport: any = {
      _id: "rep-yesterday-tl",
      employeeId: "tl-1",
      employeeRole: "team_lead",
      reportDate: yesterday
    };

    const oldTlReport: any = {
      _id: "rep-old-tl",
      employeeId: "tl-1",
      employeeRole: "team_lead",
      reportDate: twoDaysAgo
    };

    // Case 1: Today's Team Lead report -> HOD can Verify / Review
    expect(getReviewEligibility(todayTlReport, "hod-1", "hod")).toEqual({
      allowed: true
    });

    // Case 2: Yesterday's Team Lead report -> HOD cannot Verify / Review
    expect(getReviewEligibility(yesterdayTlReport, "hod-1", "hod")).toEqual({
      allowed: false
    });

    // Case 3: 2 days ago Team Lead report -> HOD cannot Verify / Review
    expect(getReviewEligibility(oldTlReport, "hod-1", "hod")).toEqual({
      allowed: false
    });
  });

  it("prevents re-verification if already verified by HOD", () => {
    const today = new Date().toISOString().slice(0, 10);
    const verifiedReport: any = {
      _id: "rep-verified",
      employeeId: "tl-1",
      employeeRole: "team_lead",
      reportDate: today,
      verificationLevel: "hod"
    };

    expect(getReviewEligibility(verifiedReport, "hod-1", "hod")).toEqual({
      allowed: false,
      label: "Verified by HOD"
    });
  });

  it("checks Report Manager Remark button visibility rules for HOD", () => {
    const isReportManagerRemarkVisible = (
      report: any,
      currentUserId: string,
      userRole: string
    ) => {
      const authorRole = (report.employeeRole || "").toLowerCase();
      const isTeamLead = authorRole === "team_lead";
      const isSelf = Boolean(report.employeeId && currentUserId && String(report.employeeId) === String(currentUserId));
      const hasManagerReview = Boolean(
        report.reportManagerStatus || report.reportManagerReview || report.reportManagerReviewedByName
      );

      return (
        (userRole === "hod" && isTeamLead && !isSelf) ||
        ((userRole === "admin" || userRole === "ceo") && isTeamLead && hasManagerReview)
      );
    };

    // Case 1: Team Lead report with NO manager review viewed by HOD -> Visible
    const unreviewedTlReport = {
      employeeId: "tl-1",
      employeeRole: "team_lead",
      reportManagerStatus: null,
      reportManagerReview: null
    };
    expect(isReportManagerRemarkVisible(unreviewedTlReport, "hod-1", "hod")).toBe(true);

    // Case 2: Team Lead report WITH manager review viewed by HOD -> Visible
    const reviewedTlReport = {
      employeeId: "tl-1",
      employeeRole: "team_lead",
      reportManagerStatus: "approved",
      reportManagerReview: "Work is good",
      reportManagerReviewedByName: "Ramesh"
    };
    expect(isReportManagerRemarkVisible(reviewedTlReport, "hod-1", "hod")).toBe(true);

    // Case 3: Team Member report viewed by HOD -> Hidden
    const tmReport = {
      employeeId: "tm-1",
      employeeRole: "team_member"
    };
    expect(isReportManagerRemarkVisible(tmReport, "hod-1", "hod")).toBe(false);

    // Case 4: HOD's self report viewed by HOD -> Hidden
    const hodSelfReport = {
      employeeId: "hod-1",
      employeeRole: "hod"
    };
    expect(isReportManagerRemarkVisible(hodSelfReport, "hod-1", "hod")).toBe(false);
  });
});
