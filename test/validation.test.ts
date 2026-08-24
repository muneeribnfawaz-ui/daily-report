import { describe, it, expect } from "vitest";
import { adminCreateUserSchema, adminUpdateUserSchema } from "@/lib/validation";

describe("Validation Schemas", () => {
  describe("adminCreateUserSchema", () => {
    const validBaseUser = {
      firstName: "John",
      lastName: "Doe",
      phone: "9876543210",
      empID: "EMP001",
      email: "john@example.com",
      password: "Password123!",
      roleTypes: ["Frontend Engineer"],
      teamNames: ["Frontend Team"],
      departments: [{ name: "Software", subTeams: [] }],
      managerName: "Jane Smith",
    };

    it("should require workspaceId for a team_member", () => {
      const payload = {
        ...validBaseUser,
        role: "team_member",
        // workspaceId is missing
      };
      const result = adminCreateUserSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const companyIssue = result.error.issues.find((i) => i.path.includes("workspaceId"));
        expect(companyIssue).toBeDefined();
        expect(companyIssue?.message).toBe("Workspace is required");
      }
    });

    it("should pass when workspaceId is provided for a team_member", () => {
      const payload = {
        ...validBaseUser,
        role: "team_member",
        workspaceId: "6a857bb9315b49aa4c6906cd",
      };
      const result = adminCreateUserSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("should not require workspaceId for an admin", () => {
      const payload = {
        ...validBaseUser,
        role: "admin",
        // no workspaceId needed for admin
      };
      // Admin doesn't require teamNames, managerName, or departments, so let's adjust payload
      const adminPayload = {
        firstName: "Admin",
        lastName: "User",
        phone: "9876543210",
        empID: "ADM001",
        email: "admin@example.com",
        password: "Password123!",
        role: "admin",
        roleTypes: ["Frontend Engineer"],
        departments: [{ name: "Software", subTeams: [] }],
        teamNames: ["Frontend Team"],
      };
      const result = adminCreateUserSchema.safeParse(adminPayload);
      expect(result.success).toBe(true);
    });
  });

  describe("adminUpdateUserSchema", () => {
    it("should allow missing workspaceId for update", () => {
      const payload = {
        firstName: "Updated Name",
      };
      const result = adminUpdateUserSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("should validate valid workspaceId updates", () => {
      const payload = {
        workspaceId: "6a857bb9315b49aa4c6906cd",
      };
      const result = adminUpdateUserSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });
});
