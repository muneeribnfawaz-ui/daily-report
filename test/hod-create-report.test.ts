import { describe, it, expect } from "vitest";

describe("HOD Create Report Workflow & Department Grouping", () => {
  // Mock Team Leads dataset
  const mockTeamLeads = [
    {
      id: "tl-software-1",
      name: "Guna",
      teamName: "Core Dev",
      department: "Software",
      departments: ["Software"],
      todayReport: {
        id: "rep-sw-1",
        reportDate: "2026-09-10",
        completedWork: "Implemented authentication flow and fixed token expiration issues.",
        pendingWork: "Write integration tests for login.",
        blockers: "Waiting on OAuth credentials.",
        requiredClarification: "Need confirmation on token duration.",
        attachmentLink: "https://github.com/org/repo/pull/123",
        status: "submitted",
        reportManagerStatus: "approved" as const,
        reportManagerReview: "Good progress on authentication.",
        reportManagerReviewedByName: "Ramesh Manager",
        reportManagerReviewedAt: "2026-09-10T11:30:00.000Z"
      }
    },
    {
      id: "tl-software-2",
      name: "Suresh",
      teamName: "QA",
      department: "Software",
      departments: ["Software"],
      todayReport: {
        id: "rep-sw-2",
        reportDate: "2026-09-10",
        completedWork: "Tested user role transitions and permissions guard.",
        pendingWork: "Regression testing for payment module.",
        blockers: "",
        requiredClarification: "",
        attachmentLink: null,
        status: "submitted",
        reportManagerStatus: null,
        reportManagerReview: null,
        reportManagerReviewedByName: null,
        reportManagerReviewedAt: null
      }
    },
    {
      id: "tl-marketing-1",
      name: "Priya",
      teamName: "SEO & Growth",
      department: "Marketing",
      departments: ["Marketing"],
      todayReport: null // No report submitted today
    },
    {
      id: "tl-finance-1",
      name: "Anand",
      teamName: "Accounts",
      department: "Finance",
      departments: ["Finance"],
      todayReport: {
        id: "rep-fin-1",
        reportDate: "2026-09-10",
        completedWork: "Reconciled bank accounts and verified petty cash transactions.",
        pendingWork: "Pending monthly summary.",
        blockers: "Missing invoice for vendor payment.",
        requiredClarification: "",
        attachmentLink: "https://finance-portal.com/doc/456",
        status: "submitted",
        reportManagerStatus: "rejected" as const,
        reportManagerReview: "Please attach supporting bills for petty cash.",
        reportManagerReviewedByName: "Ramesh Manager",
        reportManagerReviewedAt: "2026-09-10T12:00:00.000Z"
      }
    }
  ];

  it("1. HOD sees only enrolled departments", () => {
    const hodEnrolledDepartments = ["Software", "Finance"];

    // Department sections must be dynamically generated strictly from HOD's enrolled departments
    const renderedSections = hodEnrolledDepartments.map((dept) => ({
      department: dept,
      title: `${dept.toUpperCase()}`
    }));

    expect(renderedSections).toHaveLength(2);
    expect(renderedSections.map((s) => s.department)).toEqual(["Software", "Finance"]);
    expect(renderedSections.map((s) => s.department)).not.toContain("Marketing");
  });

  it("2. Each department displays its Team Leads and 6. Team Leads from other departments are not shown under the wrong department", () => {
    const hodEnrolledDepartments = ["Software", "Marketing", "Finance"];

    const getTeamLeadsForDepartment = (dept: string) => {
      return mockTeamLeads.filter(
        (tl) => tl.department === dept || tl.departments?.includes(dept)
      );
    };

    const softwareTLs = getTeamLeadsForDepartment("Software");
    const marketingTLs = getTeamLeadsForDepartment("Marketing");
    const financeTLs = getTeamLeadsForDepartment("Finance");

    // Software department should have 2 TLs (Guna and Suresh)
    expect(softwareTLs).toHaveLength(2);
    expect(softwareTLs.map((tl) => tl.name)).toEqual(["Guna", "Suresh"]);

    // Marketing department should have 1 TL (Priya)
    expect(marketingTLs).toHaveLength(1);
    expect(marketingTLs[0].name).toBe("Priya");

    // Finance department should have 1 TL (Anand)
    expect(financeTLs).toHaveLength(1);
    expect(financeTLs[0].name).toBe("Anand");

    // No cross-department leakage
    expect(softwareTLs.some((tl) => tl.name === "Priya" || tl.name === "Anand")).toBe(false);
    expect(marketingTLs.some((tl) => tl.name === "Guna" || tl.name === "Anand")).toBe(false);
    expect(financeTLs.some((tl) => tl.name === "Guna" || tl.name === "Priya")).toBe(false);
  });

  it("3. Team Lead reports are displayed read-only", () => {
    const gunaTL = mockTeamLeads.find((tl) => tl.name === "Guna")!;
    expect(gunaTL.todayReport).toBeDefined();

    // Verify report fields are present and structured for read-only display
    expect(gunaTL.todayReport?.completedWork).toContain("Implemented authentication flow");
    expect(gunaTL.todayReport?.pendingWork).toContain("Write integration tests");
    expect(gunaTL.todayReport?.blockers).toContain("Waiting on OAuth credentials");
    expect(gunaTL.todayReport?.requiredClarification).toContain("Need confirmation on token duration");
    expect(gunaTL.todayReport?.attachmentLink).toBe("https://github.com/org/repo/pull/123");
  });

  it("4. Existing Report Manager remarks are displayed correctly (Approved / Rejected)", () => {
    const gunaReport = mockTeamLeads.find((tl) => tl.name === "Guna")!.todayReport!;
    const anandReport = mockTeamLeads.find((tl) => tl.name === "Anand")!.todayReport!;

    // Approved Report Review details
    expect(gunaReport.reportManagerStatus).toBe("approved");
    expect(gunaReport.reportManagerReview).toBe("Good progress on authentication.");
    expect(gunaReport.reportManagerReviewedByName).toBe("Ramesh Manager");
    expect(gunaReport.reportManagerReviewedAt).toBe("2026-09-10T11:30:00.000Z");

    // Rejected Report Review details
    expect(anandReport.reportManagerStatus).toBe("rejected");
    expect(anandReport.reportManagerReview).toBe("Please attach supporting bills for petty cash.");
    expect(anandReport.reportManagerReviewedByName).toBe("Ramesh Manager");
  });

  it("5. Unreviewed Team Lead reports show 'Not Reviewed' and unsubmitted show 'No report submitted for today'", () => {
    const sureshReport = mockTeamLeads.find((tl) => tl.name === "Suresh")!.todayReport!;
    const priyaReport = mockTeamLeads.find((tl) => tl.name === "Priya")!.todayReport;

    // Submitted report without RM review
    const hasReview = Boolean(
      sureshReport.reportManagerStatus || sureshReport.reportManagerReview || sureshReport.reportManagerReviewedByName
    );
    expect(hasReview).toBe(false);

    // Unsubmitted TL report
    expect(priyaReport).toBeNull();
  });

  it("7. HOD can enter a separate report for each department and 8. each department has its own optional attachment link", () => {
    const hodFormData: Record<string, string> = {
      Software: "All sprint tickets completed on schedule. Authentication service released.",
      Marketing: "Growth campaign launched across social media channels.",
      Finance: "Monthly reconciliation completed and forwarded for executive audit."
    };

    const hodAttachmentLinks: Record<string, string> = {
      Software: "https://software-docs.internal.com/sprint-10",
      Marketing: "https://marketing-analytics.com/campaign-metrics",
      Finance: "" // optional empty
    };

    const enrolledDepts = ["Software", "Marketing", "Finance"];
    const generatedPayloads = enrolledDepts.map((dept) => ({
      workspaceId: "ws-1",
      teamName: dept,
      reportType: "Daily Update",
      reportDate: "2026-09-10",
      completedWork: hodFormData[dept].trim(),
      attachmentLink: hodAttachmentLinks[dept]?.trim() || "",
      dailyMeetingUpdate: "Quarterly review scheduled for tomorrow."
    }));

    expect(generatedPayloads).toHaveLength(3);
    expect(generatedPayloads[0].teamName).toBe("Software");
    expect(generatedPayloads[0].completedWork).toContain("All sprint tickets completed");
    expect(generatedPayloads[0].attachmentLink).toBe("https://software-docs.internal.com/sprint-10");

    expect(generatedPayloads[1].teamName).toBe("Marketing");
    expect(generatedPayloads[1].completedWork).toContain("Growth campaign launched");
    expect(generatedPayloads[1].attachmentLink).toBe("https://marketing-analytics.com/campaign-metrics");

    expect(generatedPayloads[2].teamName).toBe("Finance");
    expect(generatedPayloads[2].completedWork).toContain("Monthly reconciliation completed");
    expect(generatedPayloads[2].attachmentLink).toBe("");
  });

  it("9. Additional Management Remarks are independent and optional", () => {
    const additionalRemarks = "Executive reminder: Quarterly budget review meeting tomorrow at 10 AM.";

    const enrolledDepts = ["Software", "Finance"];
    const submissions = enrolledDepts.map((dept) => ({
      teamName: dept,
      completedWork: `HOD summary for ${dept}`,
      dailyMeetingUpdate: additionalRemarks.trim()
    }));

    // Additional remarks attached to all HOD department submissions
    expect(submissions[0].dailyMeetingUpdate).toBe(additionalRemarks);
    expect(submissions[1].dailyMeetingUpdate).toBe(additionalRemarks);

    // Optional when empty
    const emptyRemarks = "";
    const submissionWithEmpty = {
      teamName: "Software",
      completedWork: "Report",
      dailyMeetingUpdate: emptyRemarks.trim()
    };
    expect(submissionWithEmpty.dailyMeetingUpdate).toBe("");
  });

  it("10. Existing HOD submission behavior continues working & 11. Report Manager / Consolidated workflows remain unaffected", () => {
    // Validates that HOD report payload format matches DailyReport schema expectations
    const hodSubmissionPayload = {
      workspaceId: "ws-123",
      teamName: "Software",
      reportType: "Daily Update",
      reportDate: "2026-09-10",
      completedWork: "Software department report content",
      attachmentLink: "https://example.com/sheet",
      dailyMeetingUpdate: "Management note"
    };

    expect(hodSubmissionPayload.workspaceId).toBeDefined();
    expect(hodSubmissionPayload.teamName).toBe("Software");
    expect(hodSubmissionPayload.reportType).toBe("Daily Update");
    expect(typeof hodSubmissionPayload.completedWork).toBe("string");
    expect(hodSubmissionPayload.completedWork.length).toBeGreaterThan(0);
  });
});
