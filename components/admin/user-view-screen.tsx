"use client";

import Link from "next/link";
import type { Route } from "next";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS, normalizeRole } from "@/lib/constants";

type UserDetail = {
  _id: string;
  name?: string;
  email?: string;
  role?: string;
  teamName?: string;
  teamNames?: string[];
  managerName?: string;
  empID?: string;
  phone?: string;
  status?: string;
};

export function UserViewScreen({
  userId,
  backHref,
  editHref,
  reportHref
}: {
  userId: string;
  backHref: string;
  editHref: string;
  reportHref: string;
}) {
  const query = useQuery({
    queryKey: ["user-view", userId],
    queryFn: async () => {
      const response = await api.get(`/api/users/${userId}`);
      return response.data?.data as UserDetail;
    }
  });

  const user = query.data;
  const teamLabel = user?.teamNames?.length ? user.teamNames.join(", ") : user?.teamName ?? "—";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle>User Details</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Read-only profile view for this user.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={backHref as Route}>Back</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={editHref as Route}>Edit</Link>
          </Button>
          <Button asChild>
            <Link href={reportHref as Route}>Report</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {query.isLoading ? (
          <div className="text-sm text-muted-foreground">Loading user...</div>
        ) : query.isError || !user ? (
          <div className="text-sm text-danger">Failed to load user.</div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant="soft">{user.name ?? "—"}</Badge>
              <Badge variant="outline">{user.email ?? "—"}</Badge>
              <Badge variant="outline">{ROLE_LABELS[normalizeRole(user.role) ?? "team_member"]}</Badge>
              <Badge variant="outline">{user.status ?? "—"}</Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border bg-background/70 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Team</div>
                <div className="mt-1 text-sm font-medium">{teamLabel}</div>
              </div>
              <div className="rounded-xl border bg-background/70 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Manager</div>
                <div className="mt-1 text-sm font-medium">{user.managerName ?? "—"}</div>
              </div>
              <div className="rounded-xl border bg-background/70 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Employee ID</div>
                <div className="mt-1 text-sm font-medium">{user.empID ?? "—"}</div>
              </div>
              <div className="rounded-xl border bg-background/70 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Phone</div>
                <div className="mt-1 text-sm font-medium">{user.phone ?? "—"}</div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
