import { describe, it, expect } from "vitest";
import { normalizeEmpId } from "@/lib/utils";

describe("Employee ID Uniqueness & Scoping Logic", () => {
  type MockWorkspaceMember = {
    id: string;
    userId: string;
    workspaceId: string;
    empID: string;
    empIDNormalized: string;
    role: string;
  };

  function validateAndInsertMember(
    store: MockWorkspaceMember[],
    input: {
      userId: string;
      workspaceId: string;
      empID: string;
      role: string;
    }
  ) {
    const rawEmpId = (input.empID || "").trim();
    const normalizedEmpId = normalizeEmpId(rawEmpId);

    if (input.workspaceId && normalizedEmpId) {
      const existing = store.find(
        (m) =>
          m.workspaceId === input.workspaceId &&
          (m.empIDNormalized === normalizedEmpId ||
            normalizeEmpId(m.empID) === normalizedEmpId)
      );

      if (existing) {
        return {
          success: false,
          statusCode: 2004,
          httpStatus: 409,
          message: "Employee ID already exists. Please enter a unique Employee ID."
        };
      }
    }

    const newMember: MockWorkspaceMember = {
      id: `member-${store.length + 1}`,
      userId: input.userId,
      workspaceId: input.workspaceId,
      empID: rawEmpId || "EMP",
      empIDNormalized: normalizedEmpId || "emp",
      role: input.role
    };

    store.push(newMember);

    return {
      success: true,
      statusCode: 2001,
      httpStatus: 201,
      data: newMember
    };
  }

  function validateAndUpdateMember(
    store: MockWorkspaceMember[],
    memberId: string,
    updates: { empID?: string; role?: string }
  ) {
    const targetIndex = store.findIndex((m) => m.id === memberId);
    if (targetIndex === -1) {
      return { success: false, httpStatus: 404, message: "Member not found" };
    }

    const currentMember = store[targetIndex];

    if (updates.empID !== undefined) {
      const rawEmpId = updates.empID.trim();
      const normalizedEmpId = normalizeEmpId(rawEmpId);

      if (normalizedEmpId && currentMember.workspaceId) {
        const existingOther = store.find(
          (m) =>
            m.workspaceId === currentMember.workspaceId &&
            m.id !== currentMember.id &&
            (m.empIDNormalized === normalizedEmpId ||
              normalizeEmpId(m.empID) === normalizedEmpId)
        );

        if (existingOther) {
          return {
            success: false,
            statusCode: 2004,
            httpStatus: 409,
            message: "Employee ID already exists. Please enter a unique Employee ID."
          };
        }
      }

      currentMember.empID = rawEmpId;
      currentMember.empIDNormalized = normalizedEmpId;
    }

    if (updates.role !== undefined) {
      currentMember.role = updates.role;
    }

    return {
      success: true,
      httpStatus: 200,
      data: currentMember
    };
  }

  describe("Normalization Rule: normalizeEmpId()", () => {
    it("lowercases standard uppercase IDs", () => {
      expect(normalizeEmpId("EMP001")).toBe("emp001");
      expect(normalizeEmpId("CONST101")).toBe("const101");
      expect(normalizeEmpId("CEO")).toBe("ceo");
    });

    it("trims surrounding whitespace correctly", () => {
      expect(normalizeEmpId("  EMP001  ")).toBe("emp001");
      expect(normalizeEmpId("\tEMP001\n")).toBe("emp001");
      expect(normalizeEmpId("   ")).toBe("");
    });

    it("handles empty or null values gracefully", () => {
      expect(normalizeEmpId("")).toBe("");
      expect(normalizeEmpId(null)).toBe("");
      expect(normalizeEmpId(undefined)).toBe("");
    });
  });

  describe("Creation Uniqueness & Workspace Scoping", () => {
    it("succeeds when creating an employee with a new unique Employee ID", () => {
      const store: MockWorkspaceMember[] = [];
      const res = validateAndInsertMember(store, {
        userId: "user-1",
        workspaceId: "workspace-alpha",
        empID: "EMP001",
        role: "team_member"
      });

      expect(res.success).toBe(true);
      expect(res.httpStatus).toBe(201);
      expect(store.length).toBe(1);
      expect(store[0].empID).toBe("EMP001");
      expect(store[0].empIDNormalized).toBe("emp001");
    });

    it("rejects creation with exact same Employee ID in the same workspace (409)", () => {
      const store: MockWorkspaceMember[] = [
        {
          id: "m-1",
          userId: "user-1",
          workspaceId: "workspace-alpha",
          empID: "EMP001",
          empIDNormalized: "emp001",
          role: "team_member"
        }
      ];

      const res = validateAndInsertMember(store, {
        userId: "user-2",
        workspaceId: "workspace-alpha",
        empID: "EMP001",
        role: "team_member"
      });

      expect(res.success).toBe(false);
      expect(res.httpStatus).toBe(409);
      expect(res.statusCode).toBe(2004);
      expect(res.message).toBe("Employee ID already exists. Please enter a unique Employee ID.");
      expect(store.length).toBe(1);
    });

    it("rejects case-insensitive duplicates (EMP001 vs emp001) in the same workspace", () => {
      const store: MockWorkspaceMember[] = [
        {
          id: "m-1",
          userId: "user-1",
          workspaceId: "workspace-alpha",
          empID: "EMP001",
          empIDNormalized: "emp001",
          role: "team_member"
        }
      ];

      const res = validateAndInsertMember(store, {
        userId: "user-2",
        workspaceId: "workspace-alpha",
        empID: "emp001",
        role: "team_lead"
      });

      expect(res.success).toBe(false);
      expect(res.httpStatus).toBe(409);
      expect(res.message).toBe("Employee ID already exists. Please enter a unique Employee ID.");
    });

    it("rejects whitespace-padded duplicates (' EMP001 ') in the same workspace", () => {
      const store: MockWorkspaceMember[] = [
        {
          id: "m-1",
          userId: "user-1",
          workspaceId: "workspace-alpha",
          empID: "EMP001",
          empIDNormalized: "emp001",
          role: "team_member"
        }
      ];

      const res = validateAndInsertMember(store, {
        userId: "user-2",
        workspaceId: "workspace-alpha",
        empID: "  EMP001  ",
        role: "team_member"
      });

      expect(res.success).toBe(false);
      expect(res.httpStatus).toBe(409);
      expect(res.message).toBe("Employee ID already exists. Please enter a unique Employee ID.");
    });

    it("allows the same Employee ID in different workspaces (workspace scoping)", () => {
      const store: MockWorkspaceMember[] = [
        {
          id: "m-1",
          userId: "user-1",
          workspaceId: "workspace-alpha",
          empID: "EMP001",
          empIDNormalized: "emp001",
          role: "team_member"
        }
      ];

      const res = validateAndInsertMember(store, {
        userId: "user-2",
        workspaceId: "workspace-beta",
        empID: "EMP001",
        role: "team_member"
      });

      expect(res.success).toBe(true);
      expect(res.httpStatus).toBe(201);
      expect(store.length).toBe(2);
      expect(store[1].workspaceId).toBe("workspace-beta");
    });
  });

  describe("Update Operations Uniqueness", () => {
    it("allows updating employee while keeping their own existing Employee ID", () => {
      const store: MockWorkspaceMember[] = [
        {
          id: "m-1",
          userId: "user-1",
          workspaceId: "workspace-alpha",
          empID: "EMP001",
          empIDNormalized: "emp001",
          role: "team_member"
        }
      ];

      const res = validateAndUpdateMember(store, "m-1", {
        empID: "EMP001",
        role: "team_lead"
      });

      expect(res.success).toBe(true);
      expect(res.httpStatus).toBe(200);
      expect(store[0].role).toBe("team_lead");
      expect(store[0].empID).toBe("EMP001");
    });

    it("rejects updating an employee's ID to another existing employee's ID in the same workspace", () => {
      const store: MockWorkspaceMember[] = [
        {
          id: "m-1",
          userId: "user-1",
          workspaceId: "workspace-alpha",
          empID: "EMP001",
          empIDNormalized: "emp001",
          role: "team_member"
        },
        {
          id: "m-2",
          userId: "user-2",
          workspaceId: "workspace-alpha",
          empID: "EMP002",
          empIDNormalized: "emp002",
          role: "team_member"
        }
      ];

      const res = validateAndUpdateMember(store, "m-2", {
        empID: "EMP001"
      });

      expect(res.success).toBe(false);
      expect(res.httpStatus).toBe(409);
      expect(res.statusCode).toBe(2004);
      expect(res.message).toBe("Employee ID already exists. Please enter a unique Employee ID.");
      expect(store[1].empID).toBe("EMP002");
    });

    it("rejects updating with case variation of another member's ID", () => {
      const store: MockWorkspaceMember[] = [
        {
          id: "m-1",
          userId: "user-1",
          workspaceId: "workspace-alpha",
          empID: "EMP001",
          empIDNormalized: "emp001",
          role: "team_member"
        },
        {
          id: "m-2",
          userId: "user-2",
          workspaceId: "workspace-alpha",
          empID: "EMP002",
          empIDNormalized: "emp002",
          role: "team_member"
        }
      ];

      const res = validateAndUpdateMember(store, "m-2", {
        empID: "emp001"
      });

      expect(res.success).toBe(false);
      expect(res.httpStatus).toBe(409);
      expect(res.message).toBe("Employee ID already exists. Please enter a unique Employee ID.");
    });
  });

  describe("Database Error & Constraint Handling", () => {
    function handleDatabaseError(error: any) {
      if (
        error?.code === "P2002" ||
        String(error?.message).includes("empID") ||
        String(error?.message).includes("Unique constraint")
      ) {
        return {
          success: false,
          statusCode: 2004,
          httpStatus: 409,
          message: "Employee ID already exists. Please enter a unique Employee ID."
        };
      }
      throw error;
    }

    it("converts Prisma P2002 unique constraint error to clean 409 response", () => {
      const prismaError = {
        code: "P2002",
        message: "Unique constraint failed on the fields: (`workspaceId`,`empIDNormalized`)"
      };

      const result = handleDatabaseError(prismaError);
      expect(result.httpStatus).toBe(409);
      expect(result.statusCode).toBe(2004);
      expect(result.message).toBe("Employee ID already exists. Please enter a unique Employee ID.");
    });

    it("rethrows unrelated database errors", () => {
      const genericError = new Error("Connection lost to database");
      expect(() => handleDatabaseError(genericError)).toThrow("Connection lost to database");
    });
  });

  describe("Frontend Error Mapping", () => {
    function mapServerResponseToFormField(
      errorResponse: { statusCode?: number; message?: string }
    ) {
      const fieldErrors: Record<string, string> = {};
      const responseMessage = errorResponse?.message;

      if (
        errorResponse?.statusCode === 2004 ||
        responseMessage?.toLowerCase().includes("employee id")
      ) {
        fieldErrors["empID"] = responseMessage || "Employee ID already exists. Please enter a unique Employee ID.";
      }

      return fieldErrors;
    }

    it("maps 409 conflict with statusCode 2004 to empID field error", () => {
      const errorResponse = {
        statusCode: 2004,
        message: "Employee ID already exists. Please enter a unique Employee ID."
      };

      const fieldErrors = mapServerResponseToFormField(errorResponse);
      expect(fieldErrors["empID"]).toBe("Employee ID already exists. Please enter a unique Employee ID.");
    });

    it("maps conflict message containing 'employee id' to empID field error", () => {
      const errorResponse = {
        message: "Employee ID already exists. Please enter a unique Employee ID."
      };

      const fieldErrors = mapServerResponseToFormField(errorResponse);
      expect(fieldErrors["empID"]).toBe("Employee ID already exists. Please enter a unique Employee ID.");
    });
  });
});
