"use client";

import { useQuery } from "@tanstack/react-query";
import type { SessionUser } from "@/lib/types";

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      if (!response.ok) return null;
      const json = (await response.json()) as { data: SessionUser | null };
      return json.data;
    },
    staleTime: 60_000
  });
}
