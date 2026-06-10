"use client";

import Link from "next/link";
import type { Route } from "next";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import type { SessionUser } from "@/lib/types";

export function CreateUserButton({
  href = "/report-manager/users/create"
}: {
  href?: Route;
}) {
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const response = await api.get("/api/auth/me");
      return response.data?.data as SessionUser | null;
    },
    staleTime: 60_000
  });

  if (!currentUser || (currentUser.role !== "team_lead" && currentUser.role !== "hod" && currentUser.role !== "admin")) {
    return null;
  }

  return (
    <Button asChild variant="outline">
      <Link href={href}>Create User</Link>
    </Button>
  );
}
