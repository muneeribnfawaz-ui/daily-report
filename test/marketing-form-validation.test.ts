import { describe, it, expect } from "vitest";
import { dailyReportSchema, isValidEmail, isValidMobile } from "@/lib/validation";

describe("Marketing Form Validation", () => {
  describe("isValidMobile", () => {
    it("should return true for exactly 10 numeric digits", () => {
      expect(isValidMobile("9876543210")).toBe(true);
      expect(isValidMobile("1234567890")).toBe(true);
    });

    it("should return false for fewer than 10 digits", () => {
      expect(isValidMobile("12345")).toBe(false);
      expect(isValidMobile("987654321")).toBe(false);
      expect(isValidMobile("")).toBe(false);
      expect(isValidMobile(null)).toBe(false);
      expect(isValidMobile(undefined)).toBe(false);
    });

    it("should return false for more than 10 digits", () => {
      expect(isValidMobile("12345678901")).toBe(false);
      expect(isValidMobile("9876543210123")).toBe(false);
    });

    it("should return false for mobile numbers with alphabets or special characters", () => {
      expect(isValidMobile("98765abcde")).toBe(false);
      expect(isValidMobile("98765-43210")).toBe(false);
      expect(isValidMobile("+919876543210")).toBe(false);
      expect(isValidMobile("98765 43210")).toBe(false);
    });
  });

  describe("Mobile sanitization logic (as executed in form inputs)", () => {
    const sanitizeMobile = (val: string) => val.replace(/\D/g, "").slice(0, 10);

    it("should strip non-digit characters and truncate to max 10 digits", () => {
      expect(sanitizeMobile("987-654-3210")).toBe("9876543210");
      expect(sanitizeMobile("+91 98765 43210")).toBe("9198765432");
      expect(sanitizeMobile("abc9876543210xyz")).toBe("9876543210");
      expect(sanitizeMobile("12345678909999")).toBe("1234567890");
    });
  });

  describe("isValidEmail", () => {
    it("should return true for valid email formats", () => {
      expect(isValidEmail("user@example.com")).toBe(true);
      expect(isValidEmail("john.doe@company.org")).toBe(true);
      expect(isValidEmail("test+tag@domain.co.uk")).toBe(true);
      expect(isValidEmail("admin@sub.domain.io")).toBe(true);
    });

    it("should return false for invalid email formats", () => {
      expect(isValidEmail("user@")).toBe(false);
      expect(isValidEmail("user.com")).toBe(false);
      expect(isValidEmail("@example.com")).toBe(false);
      expect(isValidEmail("user@.com")).toBe(false);
      expect(isValidEmail("user example@gmail.com")).toBe(false);
      expect(isValidEmail("user@domain..com")).toBe(false);
      expect(isValidEmail("user@domain.c")).toBe(false);
      expect(isValidEmail("")).toBe(false);
      expect(isValidEmail(null)).toBe(false);
      expect(isValidEmail(undefined)).toBe(false);
    });
  });

  describe("dailyReportSchema - Marketing Self Report Items", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    const validSelfItem = {
      executiveName: "Executive One",
      clientName: "Client A",
      companyName: "Acme Corp",
      clientType: "Direct",
      mobileNo: "9876543210",
      location: "City",
      referredBy: "Manager",
      discussionSummary: "Project discussion",
      interestLevel: "High",
      followUpDate: tomorrowStr,
      status: "In Progress",
      remarks: "Test remarks"
    };

    it("should validate a valid self report item with exactly 10 digits mobile", () => {
      const result = dailyReportSchema.safeParse({
        completedWork: "Completed tasks",
        marketingSelfItems: [validSelfItem]
      });
      expect(result.success).toBe(true);
    });

    it("should fail validation if mobile number has fewer than 10 digits", () => {
      const result = dailyReportSchema.safeParse({
        completedWork: "Completed tasks",
        marketingSelfItems: [{ ...validSelfItem, mobileNo: "987654321" }]
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.includes("mobileNo"));
        expect(issue).toBeDefined();
        expect(issue?.message).toBe("Mobile number must be exactly 10 digits.");
      }
    });

    it("should fail validation if mobile number contains letters or symbols", () => {
      const result = dailyReportSchema.safeParse({
        completedWork: "Completed tasks",
        marketingSelfItems: [{ ...validSelfItem, mobileNo: "98765ABCDE" }]
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.includes("mobileNo"));
        expect(issue).toBeDefined();
        expect(issue?.message).toBe("Mobile number must be exactly 10 digits.");
      }
    });

    it("should fail validation if mobile number is empty", () => {
      const result = dailyReportSchema.safeParse({
        completedWork: "Completed tasks",
        marketingSelfItems: [{ ...validSelfItem, mobileNo: "" }]
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.includes("mobileNo"));
        expect(issue).toBeDefined();
      }
    });
  });

  describe("dailyReportSchema - Marketing Client Report Items", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    const validClientItem = {
      executiveName: "Executive Two",
      clientName: "Client B",
      companyName: "Beta Corp",
      clientType: "Channel",
      contactPerson: "Jane Smith",
      mobileNo: "9123456780",
      email: "jane.smith@betacorp.com",
      projectType: "Commercial",
      requirementDiscussed: "Discussed requirement scope",
      projectStage: "Initial",
      decisionMaker: "Jane Smith",
      interestLevel: "High",
      nextAction: "Send proposal",
      followUpDate: tomorrowStr,
      status: "Active",
      remarks: "Ready for follow up"
    };

    it("should validate a valid client report item with 10 digits mobile and valid email", () => {
      const result = dailyReportSchema.safeParse({
        completedWork: "Completed tasks",
        marketingClientItems: [validClientItem]
      });
      expect(result.success).toBe(true);
    });

    it("should fail validation if email format is invalid", () => {
      const invalidEmails = [
        "user@",
        "user.com",
        "@example.com",
        "user@.com",
        "user example@gmail.com"
      ];

      for (const invalidEmail of invalidEmails) {
        const result = dailyReportSchema.safeParse({
          completedWork: "Completed tasks",
          marketingClientItems: [{ ...validClientItem, email: invalidEmail }]
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          const issue = result.error.issues.find((i) => i.path.includes("email"));
          expect(issue).toBeDefined();
          expect(issue?.message).toBe("Please enter a valid email address.");
        }
      }
    });

    it("should fail validation if email is empty", () => {
      const result = dailyReportSchema.safeParse({
        completedWork: "Completed tasks",
        marketingClientItems: [{ ...validClientItem, email: "" }]
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.includes("email"));
        expect(issue).toBeDefined();
        expect(issue?.message).toBe("Email is required");
      }
    });

    it("should fail validation if client mobile number is fewer than 10 digits", () => {
      const result = dailyReportSchema.safeParse({
        completedWork: "Completed tasks",
        marketingClientItems: [{ ...validClientItem, mobileNo: "12345" }]
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.includes("mobileNo"));
        expect(issue).toBeDefined();
        expect(issue?.message).toBe("Mobile number must be exactly 10 digits.");
      }
    });
  });

  describe("Multi-row dynamic validation", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    const validClientItem1 = {
      executiveName: "Exec 1",
      clientName: "Client 1",
      companyName: "Corp 1",
      clientType: "Direct",
      contactPerson: "Contact 1",
      mobileNo: "9000000001",
      email: "contact1@corp1.com",
      projectType: "Type A",
      requirementDiscussed: "Req 1",
      projectStage: "Stage 1",
      decisionMaker: "DM 1",
      interestLevel: "High",
      nextAction: "Action 1",
      followUpDate: tomorrowStr,
      status: "Active",
      remarks: "None"
    };

    const validClientItem2 = {
      executiveName: "Exec 2",
      clientName: "Client 2",
      companyName: "Corp 2",
      clientType: "Direct",
      contactPerson: "Contact 2",
      mobileNo: "9000000002",
      email: "contact2@corp2.com",
      projectType: "Type B",
      requirementDiscussed: "Req 2",
      projectStage: "Stage 2",
      decisionMaker: "DM 2",
      interestLevel: "Medium",
      nextAction: "Action 2",
      followUpDate: tomorrowStr,
      status: "Active",
      remarks: "None"
    };

    it("should pass when multiple rows all have valid mobile numbers and emails", () => {
      const result = dailyReportSchema.safeParse({
        completedWork: "Completed tasks",
        marketingClientItems: [validClientItem1, validClientItem2]
      });
      expect(result.success).toBe(true);
    });

    it("should fail and identify the exact row when row 2 has an invalid mobile number", () => {
      const invalidRow2 = { ...validClientItem2, mobileNo: "123" };
      const result = dailyReportSchema.safeParse({
        completedWork: "Completed tasks",
        marketingClientItems: [validClientItem1, invalidRow2]
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const row2Issue = result.error.issues.find(
          (i) => i.path[0] === "marketingClientItems" && i.path[1] === 1 && i.path[2] === "mobileNo"
        );
        expect(row2Issue).toBeDefined();
        expect(row2Issue?.message).toBe("Mobile number must be exactly 10 digits.");
      }
    });

    it("should fail and identify the exact row when row 1 has an invalid email", () => {
      const invalidRow1 = { ...validClientItem1, email: "invalid-email@" };
      const result = dailyReportSchema.safeParse({
        completedWork: "Completed tasks",
        marketingClientItems: [invalidRow1, validClientItem2]
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const row1Issue = result.error.issues.find(
          (i) => i.path[0] === "marketingClientItems" && i.path[1] === 0 && i.path[2] === "email"
        );
        expect(row1Issue).toBeDefined();
        expect(row1Issue?.message).toBe("Please enter a valid email address.");
      }
    });

    it("should succeed once corrected mobile and email are provided across rows", () => {
      const result = dailyReportSchema.safeParse({
        completedWork: "Completed tasks",
        marketingClientItems: [
          { ...validClientItem1, email: "fixed@corp1.com" },
          { ...validClientItem2, mobileNo: "9988776655" }
        ]
      });
      expect(result.success).toBe(true);
    });
  });
});
