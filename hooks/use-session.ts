"use client";

import { useQuery } from "@tanstack/react-query";
import type { SessionUser } from "@/lib/types";

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      if (response.status === 401 || response.status === 403) {
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
          await fetch("/api/auth/logout", { method: "POST" });
          window.location.href = `/login?from=${encodeURIComponent(window.location.pathname)}`;
        }
        return null;
      }
      if (!response.ok) return null;
      const json = (await response.json()) as { success?: boolean; data: SessionUser | null };
      if (!json.success || !json.data) {
        return null;
      }
      return json.data;
    },
    staleTime: 60_000
  });
}
