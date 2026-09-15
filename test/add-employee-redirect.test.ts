import { describe, it, expect, vi } from "vitest";
import { adminCreateUserSchema, clientCreateUserSchema } from "@/lib/validation";

// Helper function that mirrors the redirect resolution logic across employee creation forms
export function getEmployeeCreationRedirectPath(creatorRole: string, createdUserRole?: string): string {
  if (creatorRole === "admin") {
    return createdUserRole === "ceo" ? "/admin/users?role=ceo" : "/admin/users";
  }
  if (creatorRole === "ceo") {
    return "/ceo/users";
  }
  if (creatorRole === "hod") {
    return "/hod/users";
  }
  if (creatorRole === "report_manager") {
    return "/users";
  }
  if (creatorRole === "team_lead") {
    return "/team-lead/users";
  }
  return "/users";
}

// Simulated submission handler mirroring ManagerAddUserForm and AdminAddUserForm behavior
export async function simulateAddUserSubmit({
  creator,
  values,
  apiMock,
  routerMock,
  queryClientMock,
  setMessage,
  setError,
  setFieldError
}: {
  creator: { role: string; name?: string; id?: string };
  values: any;
  apiMock: { post: (url: string, data: any) => Promise<any> };
  routerMock: { push: (path: string) => void };
  queryClientMock: { invalidateQueries: (arg: any) => Promise<void> };
  setMessage: (msg: string | null) => void;
  setError: (msg: string | null) => void;
  setFieldError: (field: string, error: { type: string; message: string }) => void;
}) {
  setError(null);
  setMessage(null);

  // 1. Validation check
  const parsed = clientCreateUserSchema.safeParse(values);
  if (!parsed.success) {
    let firstErrorMsg = "";
    parsed.error.issues.forEach((issue) => {
      const fieldName = issue.path.join(".");
      setFieldError(fieldName, {
        type: "manual",
        message: issue.message || "Invalid input"
      });
      if (!firstErrorMsg) firstErrorMsg = issue.message || "Validation failed";
    });
    setError(firstErrorMsg);
    return { success: false, redirected: false };
  }

  // 2. API Call
  try {
    await apiMock.post("/api/admin/users", parsed.data);
    setMessage("User created successfully.");
    await queryClientMock.invalidateQueries({ queryKey: ["/api/admin/users"] });

    const redirectPath = getEmployeeCreationRedirectPath(creator.role, values.role);
    routerMock.push(redirectPath);
    return { success: true, redirected: true, redirectPath };
  } catch (requestError: any) {
    const errorData = requestError?.response?.data;
    const responseMessage = errorData?.message ?? requestError?.message ?? "Failed to create user.";
    if (errorData?.statusCode === 2004 || responseMessage?.toLowerCase().includes("employee id")) {
      setFieldError("empID", {
        type: "server",
        message: responseMessage || "Employee ID already exists. Please enter a unique Employee ID."
      });
    }
    setError(responseMessage);
    return { success: false, redirected: false };
  }
}

describe("Employee Creation Redirection Flow", () => {
  describe("Role-aware redirect path resolution", () => {
    it("Admin creating regular employee redirects to /admin/users", () => {
      expect(getEmployeeCreationRedirectPath("admin", "team_member")).toBe("/admin/users");
      expect(getEmployeeCreationRedirectPath("admin", "team_lead")).toBe("/admin/users");
      expect(getEmployeeCreationRedirectPath("admin", "hod")).toBe("/admin/users");
      expect(getEmployeeCreationRedirectPath("admin", "report_manager")).toBe("/admin/users");
    });

    it("Admin creating CEO redirects to /admin/users?role=ceo", () => {
      expect(getEmployeeCreationRedirectPath("admin", "ceo")).toBe("/admin/users?role=ceo");
    });

    it("CEO creating employee redirects to /ceo/users", () => {
      expect(getEmployeeCreationRedirectPath("ceo", "hod")).toBe("/ceo/users");
      expect(getEmployeeCreationRedirectPath("ceo", "team_lead")).toBe("/ceo/users");
      expect(getEmployeeCreationRedirectPath("ceo", "team_member")).toBe("/ceo/users");
    });

    it("HOD creating employee redirects to /hod/users", () => {
      expect(getEmployeeCreationRedirectPath("hod", "team_lead")).toBe("/hod/users");
      expect(getEmployeeCreationRedirectPath("hod", "report_manager")).toBe("/hod/users");
      expect(getEmployeeCreationRedirectPath("hod", "team_member")).toBe("/hod/users");
    });

    it("Report Manager creating employee redirects to /users", () => {
      expect(getEmployeeCreationRedirectPath("report_manager", "team_lead")).toBe("/users");
      expect(getEmployeeCreationRedirectPath("report_manager", "team_member")).toBe("/users");
    });

    it("Team Lead creating employee redirects to /team-lead/users", () => {
      expect(getEmployeeCreationRedirectPath("team_lead", "team_member")).toBe("/team-lead/users");
    });

    it("Unknown or fallback role redirects to /users", () => {
      expect(getEmployeeCreationRedirectPath("other", "team_member")).toBe("/users");
    });
  });

  describe("Successful creation triggers navigation & feedback", () => {
    const validUserPayload = {
      firstName: "John",
      lastName: "Doe",
      phone: "9876543210",
      empID: "EMP1001",
      email: "john.doe@example.com",
      password: "Password123!",
      confirmPassword: "Password123!",
      role: "team_member",
      workspaceId: "ws-test-1",
      departments: [{ name: "Software", subTeams: [] }],
      managerName: "Lead User",
      teamNames: ["Backend"],
      roleTypes: ["Backend Engineer"]
    };

    it("HOD (e.g. Sathish/Bagath) successfully creates user -> shows success message and navigates to /hod/users", async () => {
      const apiMock = { post: vi.fn().mockResolvedValue({ data: { success: true, statusCode: 2001 } }) };
      const routerMock = { push: vi.fn() };
      const queryClientMock = { invalidateQueries: vi.fn().mockResolvedValue(undefined) };
      let displayedMessage: string | null = null;
      let displayedError: string | null = null;
      const fieldErrors: Record<string, any> = {};

      const result = await simulateAddUserSubmit({
        creator: { role: "hod", name: "Sathish" },
        values: validUserPayload,
        apiMock,
        routerMock,
        queryClientMock,
        setMessage: (m) => (displayedMessage = m),
        setError: (e) => (displayedError = e),
        setFieldError: (f, err) => (fieldErrors[f] = err)
      });

      expect(result.success).toBe(true);
      expect(result.redirected).toBe(true);
      expect(result.redirectPath).toBe("/hod/users");
      expect(routerMock.push).toHaveBeenCalledWith("/hod/users");
      expect(displayedMessage).toBe("User created successfully.");
      expect(displayedError).toBeNull();
      expect(queryClientMock.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["/api/admin/users"] });
    });

    it("Team Lead successfully creates team member -> navigates to /team-lead/users", async () => {
      const apiMock = { post: vi.fn().mockResolvedValue({ data: { success: true, statusCode: 2001 } }) };
      const routerMock = { push: vi.fn() };
      const queryClientMock = { invalidateQueries: vi.fn().mockResolvedValue(undefined) };
      let displayedMessage: string | null = null;

      const result = await simulateAddUserSubmit({
        creator: { role: "team_lead", name: "Guna" },
        values: validUserPayload,
        apiMock,
        routerMock,
        queryClientMock,
        setMessage: (m) => (displayedMessage = m),
        setError: vi.fn(),
        setFieldError: vi.fn()
      });

      expect(result.success).toBe(true);
      expect(routerMock.push).toHaveBeenCalledWith("/team-lead/users");
      expect(displayedMessage).toBe("User created successfully.");
    });

    it("CEO successfully creates employee -> navigates to /ceo/users", async () => {
      const apiMock = { post: vi.fn().mockResolvedValue({ data: { success: true, statusCode: 2001 } }) };
      const routerMock = { push: vi.fn() };
      const queryClientMock = { invalidateQueries: vi.fn().mockResolvedValue(undefined) };

      const result = await simulateAddUserSubmit({
        creator: { role: "ceo", name: "Chief Executive" },
        values: {
          ...validUserPayload,
          role: "hod",
          managerName: "Chief Executive",
          teamNames: [],
          roleTypes: []
        },
        apiMock,
        routerMock,
        queryClientMock,
        setMessage: vi.fn(),
        setError: vi.fn(),
        setFieldError: vi.fn()
      });

      expect(result.success).toBe(true);
      expect(routerMock.push).toHaveBeenCalledWith("/ceo/users");
    });
  });

  describe("Failed submissions must stay on form and NOT redirect", () => {
    const validUserPayload = {
      firstName: "John",
      lastName: "Doe",
      phone: "9876543210",
      empID: "EMP1001",
      email: "john.doe@example.com",
      password: "Password123!",
      confirmPassword: "Password123!",
      role: "team_member",
      workspaceId: "ws-test-1",
      departments: [{ name: "Software", subTeams: [] }],
      managerName: "Lead User",
      teamNames: ["Backend"],
      roleTypes: ["Backend Engineer"]
    };

    it("Scenario C: Duplicate Employee ID response (HTTP 409 / statusCode 2004) -> shows error on empID, NO redirect", async () => {
      const duplicateError = {
        response: {
          status: 409,
          data: {
            success: false,
            statusCode: 2004,
            message: "Employee ID already exists. Please enter a unique Employee ID."
          }
        }
      };
      const apiMock = { post: vi.fn().mockRejectedValue(duplicateError) };
      const routerMock = { push: vi.fn() };
      const queryClientMock = { invalidateQueries: vi.fn() };
      let displayedMessage: string | null = null;
      let displayedError: string | null = null;
      const fieldErrors: Record<string, any> = {};

      const result = await simulateAddUserSubmit({
        creator: { role: "hod", name: "Sathish" },
        values: validUserPayload,
        apiMock,
        routerMock,
        queryClientMock,
        setMessage: (m) => (displayedMessage = m),
        setError: (e) => (displayedError = e),
        setFieldError: (f, err) => (fieldErrors[f] = err)
      });

      expect(result.success).toBe(false);
      expect(result.redirected).toBe(false);
      expect(routerMock.push).not.toHaveBeenCalled();
      expect(displayedMessage).toBeNull();
      expect(displayedError).toBe("Employee ID already exists. Please enter a unique Employee ID.");
      expect(fieldErrors.empID).toBeDefined();
      expect(fieldErrors.empID.message).toBe("Employee ID already exists. Please enter a unique Employee ID.");
    });

    it("Scenario D: Client-side validation failure -> sets field errors, NO api call, NO redirect", async () => {
      const invalidPayload = {
        ...validUserPayload,
        firstName: "", // Missing first name
        empID: "", // Missing Employee ID
        email: "invalid-email", // Bad email
        password: "short" // Bad password
      };

      const apiMock = { post: vi.fn() };
      const routerMock = { push: vi.fn() };
      const queryClientMock = { invalidateQueries: vi.fn() };
      let displayedError: string | null = null;
      const fieldErrors: Record<string, any> = {};

      const result = await simulateAddUserSubmit({
        creator: { role: "team_lead", name: "Lead" },
        values: invalidPayload,
        apiMock,
        routerMock,
        queryClientMock,
        setMessage: vi.fn(),
        setError: (e) => (displayedError = e),
        setFieldError: (f, err) => (fieldErrors[f] = err)
      });

      expect(result.success).toBe(false);
      expect(result.redirected).toBe(false);
      expect(apiMock.post).not.toHaveBeenCalled();
      expect(routerMock.push).not.toHaveBeenCalled();
      expect(displayedError).toBeTruthy();
      expect(fieldErrors.firstName).toBeDefined();
    });

    it("Duplicate email or 500 server error -> sets error message, NO redirect", async () => {
      const serverError = {
        response: {
          status: 409,
          data: {
            success: false,
            statusCode: 4001,
            message: "Email already in use"
          }
        }
      };
      const apiMock = { post: vi.fn().mockRejectedValue(serverError) };
      const routerMock = { push: vi.fn() };
      const queryClientMock = { invalidateQueries: vi.fn() };
      let displayedError: string | null = null;

      const result = await simulateAddUserSubmit({
        creator: { role: "admin" },
        values: validUserPayload,
        apiMock,
        routerMock,
        queryClientMock,
        setMessage: vi.fn(),
        setError: (e) => (displayedError = e),
        setFieldError: vi.fn()
      });

      expect(result.success).toBe(false);
      expect(result.redirected).toBe(false);
      expect(routerMock.push).not.toHaveBeenCalled();
      expect(displayedError).toBe("Email already in use");
    });

    it("Network exception / timeout -> sets error message, NO redirect", async () => {
      const networkError = new Error("Network Error: Failed to fetch");
      const apiMock = { post: vi.fn().mockRejectedValue(networkError) };
      const routerMock = { push: vi.fn() };
      const queryClientMock = { invalidateQueries: vi.fn() };
      let displayedError: string | null = null;

      const result = await simulateAddUserSubmit({
        creator: { role: "hod", name: "Bagath" },
        values: validUserPayload,
        apiMock,
        routerMock,
        queryClientMock,
        setMessage: vi.fn(),
        setError: (e) => (displayedError = e),
        setFieldError: vi.fn()
      });

      expect(result.success).toBe(false);
      expect(result.redirected).toBe(false);
      expect(routerMock.push).not.toHaveBeenCalled();
      expect(displayedError).toBe("Network Error: Failed to fetch");
    });
  });
});
