import { describe, it, expect } from "vitest";
import {
  loginSchema,
  registerSchema,
  adminCreateUserSchema,
  adminUpdateUserSchema,
  leaveRequestSchema,
  financeReportSchema
} from "./validation";

describe("Validation Schemas & Bug Finding", () => {
  describe("loginSchema & registerSchema (strictPasswordSchema)", () => {
    it("loginSchema accepts valid email and password", () => {
      const result = loginSchema.safeParse({ email: "user@example.com", password: "anypassword" });
      expect(result.success).toBe(true);
    });

    it("registerSchema rejects weak passwords lacking special chars or uppercase", () => {
      const weakPasswords = ["alllower123", "NOLOWERCASE123!", "NoSpecialChar123", "NoNumber!@#aB", "1234"];
      for (const pass of weakPasswords) {
        const result = registerSchema.safeParse({
          name: "John Doe",
          email: "john@example.com",
          password: pass,
          role: "team_member",
          teamName: "Software"
        });
        expect(result.success, `Password "${pass}" should fail validation`).toBe(false);
      }
    });

    it("registerSchema accepts strong password with required character classes", () => {
      const result = registerSchema.safeParse({
        name: "John Doe",
        email: "john@example.com",
        password: "StrongPassword123!",
        role: "team_member",
        teamName: "Software"
      });
      expect(result.success).toBe(true);
    });
  });

  describe("adminCreateUserSchema & adminUpdateUserSchema", () => {
    it("enforces manager selection for regular employees but allows bypass for admin/ceo", () => {
      const baseEmployee = {
        firstName: "Jane",
        lastName: "Doe",
        phone: "9876543210",
        empID: "EMP01",
        roleTypes: ["Web Developer"],
        teamNames: ["Software"],
        departments: [{ name: "Software", subTeams: [] }],
        email: "jane@example.com",
        password: "StrongPassword123!",
        workspaceId: "6a857bb9315b49aa4c6906cd"
      };

      // Missing manager for team_member should fail
      const memberRes = adminCreateUserSchema.safeParse({ ...baseEmployee, role: "team_member", managerName: "" });
      expect(memberRes.success).toBe(false);
      if (!memberRes.success) {
        expect(memberRes.error.issues[0].message).toContain("Select a manager");
      }

      // Missing manager for ceo should succeed
      const ceoRes = adminCreateUserSchema.safeParse({ ...baseEmployee, role: "ceo", managerName: "" });
      expect(ceoRes.success).toBe(true);
    });

    it("enforces that the departments array is not empty", () => {
      const baseEmployee = {
        firstName: "Jane",
        lastName: "Doe",
        phone: "9876543210",
        empID: "EMP01",
        role: "team_member",
        roleTypes: ["Web Developer"],
        teamNames: ["Software"],
        managerName: "John Doe",
        email: "jane@example.com",
        password: "StrongPassword123!",
        workspaceId: "6a857bb9315b49aa4c6906cd"
      };

      // Empty departments should fail
      const emptyDeptRes = adminCreateUserSchema.safeParse({ ...baseEmployee, departments: [] });
      expect(emptyDeptRes.success).toBe(false);
      if (!emptyDeptRes.success) {
        expect(emptyDeptRes.error.issues.some(i => i.message.includes("Select at least one department"))).toBe(true);
      }

      // Valid departments should succeed
      const validDeptRes = adminCreateUserSchema.safeParse({ ...baseEmployee, departments: [{ name: "Software", subTeams: [] }] });
      expect(validDeptRes.success).toBe(true);
    });

    it("detects password mismatch during user update reset", () => {
      const res = adminUpdateUserSchema.safeParse({
        resetPassword: true,
        newPassword: "StrongPassword123!",
        confirmPassword: "DifferentPassword123!"
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues.some(i => i.message.includes("do not match"))).toBe(true);
      }
    });
  });

  describe("leaveRequestSchema edge cases and business rules", () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = String(today.getMonth() + 1).padStart(2, "0");
    const validDate = `${currentYear}-${currentMonth}-15`;

    it("rejects reversed dates (toDate earlier than fromDate)", () => {
      const res = leaveRequestSchema.safeParse({
        leaveType: "Sick Leave",
        leaveDuration: "full_day",
        fromDate: validDate,
        toDate: `${currentYear}-${currentMonth}-10`,
        reason: "Feeling unwell today and tomorrow"
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues.some(i => i.message.includes("on or after from date"))).toBe(true);
      }
    });

    it("enforces same-day start and end dates for half_day leaves and requires leaveHalf selection", () => {
      // Different dates for half_day should fail
      const diffDatesRes = leaveRequestSchema.safeParse({
        leaveType: "Casual Leave",
        leaveDuration: "half_day",
        leaveHalf: "first_half",
        fromDate: validDate,
        toDate: `${currentYear}-${currentMonth}-16`,
        reason: "Personal errands to attend to"
      });
      expect(diffDatesRes.success).toBe(false);

      // Missing leaveHalf for half_day should fail
      const noHalfRes = leaveRequestSchema.safeParse({
        leaveType: "Casual Leave",
        leaveDuration: "half_day",
        fromDate: validDate,
        toDate: validDate,
        reason: "Personal errands to attend to"
      });
      expect(noHalfRes.success).toBe(false);

      // Correct half_day configuration should pass
      const validHalfRes = leaveRequestSchema.safeParse({
        leaveType: "Casual Leave",
        leaveDuration: "half_day",
        leaveHalf: "second_half",
        fromDate: validDate,
        toDate: validDate,
        reason: "Personal errands to attend to"
      });
      expect(validHalfRes.success).toBe(true);
    });

    it("rejects leave requests submitted outside the allowed 3-month window", () => {
      const res = leaveRequestSchema.safeParse({
        leaveType: "Earned Leave",
        leaveDuration: "full_day",
        fromDate: "1999-01-01",
        toDate: "1999-01-05",
        reason: "Historic holiday vacation test"
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues.some(i => i.message.includes("this month through the next 2 months"))).toBe(true);
      }
    });
  });

  describe("financeReportSchema calculations & defensive conversions", () => {
    it("converts empty string and undefined values gracefully to 0 in summary calculations", () => {
      const res = financeReportSchema.safeParse({
        reportDate: "2026-08-06",
        cashBalance: { pettyCash: "", total: undefined },
        summary: {
          totalExpenses: "150.5",
          totalReceipts: "",
          totalPayments: null,
          bankBalance: "0",
          pettyCashBalance: undefined
        },
        exchangeRate: "22.5"
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.cashBalance.pettyCash).toBe(0);
        expect(res.data.summary.totalExpenses).toBe(150.5);
        expect(res.data.summary.totalPayments).toBe(0);
        expect(res.data.exchangeRate).toBe(22.5);
      }
    });

    it("rejects negative numbers in financial reports to prevent accounting discrepancy bugs", () => {
      const res = financeReportSchema.safeParse({
        reportDate: "2026-08-06",
        cashBalance: { pettyCash: -500, total: 0 },
        summary: {
          totalExpenses: -100,
          totalReceipts: 0,
          totalPayments: 0,
          bankBalance: 0,
          pettyCashBalance: -500
        },
        exchangeRate: 22.5
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues.some(i => i.message.includes("Value must be 0 or greater"))).toBe(true);
      }
    });
  });
});
