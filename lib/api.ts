import axios from "axios";

export const api = axios.create({
  headers: {
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Content-Type": "application/json"
  }
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const selectedCompany = localStorage.getItem("daily_report_selected_company");
    if (selectedCompany) {
      config.headers["x-workspace-id"] = selectedCompany;
      if (config.method === "get" || !config.method) {
        config.params = config.params || {};
        if (!config.params.workspaceId) {
          config.params.workspaceId = selectedCompany;
        }
      }
    }
    const selectedDepartment = localStorage.getItem("daily_report_selected_department");
    if (selectedDepartment) {
      config.headers["x-department"] = selectedDepartment;
      if (config.method === "get" || !config.method) {
        config.params = config.params || {};
        if (!config.params.department) {
          config.params.department = selectedDepartment;
        }
      }
    }
  }
  return config;
});

let isLoggingOut = false;

async function handleUnauthorizedRedirect() {
  if (isLoggingOut) return;
  isLoggingOut = true;
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    // Ignore errors if logout endpoint fails, we still want to redirect
  }
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    const fromPath = window.location.pathname;
    window.location.href = fromPath && fromPath !== "/" ? `/login?from=${encodeURIComponent(fromPath)}` : "/login";
  }
}

api.interceptors.response.use(
  (response) => {
    if (
      response?.data &&
      response.data.success === false &&
      (response.data.status === "UNAUTHORIZED" || response.data.statusCode === 4003)
    ) {
      handleUnauthorizedRedirect();
    }
    return response;
  },
  async (error) => {
    const status = error.response?.status;
    const responseData = error.response?.data;
    const message = String(responseData?.message || "").toLowerCase();

    const isUnauthorized =
      status === 401 ||
      responseData?.status === "UNAUTHORIZED" ||
      responseData?.statusCode === 4003 ||
      (status === 403 &&
        (message.includes("unauthorized") ||
          message.includes("not authenticated") ||
          message.includes("token") ||
          message.includes("session") ||
          message.includes("jwt") ||
          message.includes("invalid signature")));

    if (isUnauthorized) {
      await handleUnauthorizedRedirect();
    }
    return Promise.reject(error);
  }
);

