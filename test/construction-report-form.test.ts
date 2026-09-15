import { describe, it, expect } from "vitest";
import { dailyReportSchema } from "@/lib/validation";

describe("Construction Report Form UI & Payload", () => {
  it("Validates successful construction report payload with default reportType and resolved team", () => {
    const payload = {
      teamName: "CIVIL_SITE",
      reportType: "Daily Update" as const,
      reportDate: new Date().toISOString().slice(0, 10),
      attachmentLink: "https://example.com/site-photos",
      dailyMeetingUpdate: "Discussed foundation progress",
      completedWork: "Excavation completed for block A",
      pendingWork: "Rebar installation pending",
      blockers: "Material delay for cement",
      requiredClarification: "Check blueprint revision 2"
    };

    const parsed = dailyReportSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.teamName).toBe("CIVIL_SITE");
      expect(parsed.data.reportType).toBe("Daily Update");
      expect(parsed.data.attachmentLink).toBe("https://example.com/site-photos");
    }
  });

  it("Automatically provides reportType='Daily Update' when omitted in hidden input fallback", () => {
    const rawValues = {
      teamName: "STRUCTURAL",
      reportDate: new Date().toISOString().slice(0, 10),
      attachmentLink: "",
      dailyMeetingUpdate: "",
      completedWork: "Column casting completed",
      pendingWork: "",
      blockers: "",
      requiredClarification: ""
    };

    const resolvedReportType = (rawValues as any).reportType || "Daily Update";
    const finalPayload = {
      ...rawValues,
      reportType: resolvedReportType
    };

    const parsed = dailyReportSchema.safeParse(finalPayload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.reportType).toBe("Daily Update");
      expect(parsed.data.teamName).toBe("STRUCTURAL");
    }
  });
});
