import axios from "axios";

export const api = axios.create({
  headers: {
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Content-Type": "application/json"
  }
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // If we receive a 401 Unauthorized, automatically log out
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } catch {
        // Ignore errors if logout endpoint fails, we still want to redirect
      }
      
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

