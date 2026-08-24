"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { Search } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDisplayName } from "@/lib/utils";

import { useSearchParams } from "next/navigation";

type UserItem = {
  _id: string;
  name: string;
  email: string;
  displayTeamName?: string;
};

export function AdminUserList({
  endpoint = "/api/admin/users",
  editBaseHref = "/admin/users",
  viewBaseHref = "/admin/users",
  reportBaseHref = "/admin/reports"
}: {
  endpoint?: string;
  editBaseHref?: string;
  viewBaseHref?: string;
  reportBaseHref?: string;
}) {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");
  const [search, setSearch] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("daily_report_selected_company");
      if (stored) setSelectedCompanyId(stored);

      const handleCompanyChange = (e: any) => {
        setSelectedCompanyId(e.detail);
      };
      window.addEventListener("company-changed", handleCompanyChange);
      return () => window.removeEventListener("company-changed", handleCompanyChange);
    }
  }, []);

  const query = useQuery({
    queryKey: [endpoint, search, selectedCompanyId, roleParam],
    queryFn: async () => {
      const response = await api.get(endpoint, {
        params: {
          ...(search ? { search } : {}),
          ...(selectedCompanyId ? { workspaceId: selectedCompanyId } : {}),
          ...(roleParam ? { role: roleParam } : {})
        }
      });
      return response.data?.data as UserItem[];
    }
  });

  const users = useMemo(() => query.data ?? [], [query.data]);

  return (
    <Card className="border-none shadow-none">
      <CardContent className="space-y-4 p-0 px-4 pb-4 dark:px-0 dark:pb-0">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="w-full md:max-w-sm">
            <div className="mb-1 text-sm font-medium text-foreground">Search users</div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search name or email"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
          <Badge variant="soft">{users.length} users</Badge>
        </div>

          <div className="overflow-hidden rounded-xl border border-cardBorder">
          {roleParam === "ceo" ? (
            <div className="hidden grid-cols-12 gap-3 border-b bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground md:grid">
              <div className="col-span-6">Name</div>
              <div className="col-span-4">Team</div>
              <div className="col-span-2 text-right">Edit</div>
            </div>
          ) : (
            <div className="hidden grid-cols-12 gap-3 border-b bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground md:grid">
              <div className="col-span-4">Name</div>
              <div className="col-span-3">Team</div>
              <div className="col-span-1">Edit</div>
              <div className="col-span-1">View</div>
              <div className="col-span-3">Report</div>
            </div>
          )}
          <div className="divide-y">
            {query.isLoading ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">Loading users...</div>
            ) : query.isError ? (
              <div className="px-4 py-6 text-sm text-danger">Failed to load users.</div>
            ) : users.length === 0 ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">No users found.</div>
            ) : (
              users.map((user) => {
                if (roleParam === "ceo") {
                  return (
                    <div key={user._id} className="grid grid-cols-12 items-center gap-3 px-4 py-4 text-sm hover:bg-muted/30 dark:hover:bg-muted/10 transition-colors">
                      <div className="col-span-10">
                        <Link href={`${viewBaseHref}/${user._id}` as Route} className="grid grid-cols-10 items-center gap-3 cursor-pointer">
                          <div className="min-w-0 col-span-6">
                            <div className="font-medium leading-5">{user.name}</div>
                            <div className="mt-1 break-all text-sm text-muted-foreground">{user.email}</div>
                          </div>
                          <div className="min-w-0 break-words text-muted-foreground col-span-4">
                            <span className="mr-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground md:hidden">Team</span>
                            <span>{user.displayTeamName ? formatDisplayName(user.displayTeamName) : "—"}</span>
                          </div>
                        </Link>
                      </div>
                      <div className="col-span-2 flex justify-end">
                        <Button asChild size="sm" variant="outline" className="h-8 w-24">
                          <Link href={`${editBaseHref}/${user._id}/edit` as Route}>Edit</Link>
                        </Button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={user._id} className="grid grid-cols-1 items-start gap-3 px-4 py-4 text-sm md:grid-cols-12">
                    <div className="min-w-0 md:col-span-4">
                      <div className="font-medium leading-5">{user.name}</div>
                      <div className="mt-1 break-all text-sm text-muted-foreground">{user.email}</div>
                    </div>
                    <div className="min-w-0 break-words text-muted-foreground md:col-span-3">
                      <span className="mr-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground md:hidden">Team</span>
                      <span>{user.displayTeamName ? formatDisplayName(user.displayTeamName) : "—"}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 md:col-span-5 md:grid md:grid-cols-5">
                      <Button asChild size="sm" variant="outline" className="h-8 w-full">
                        <Link href={`${editBaseHref}/${user._id}/edit` as Route}>Edit</Link>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="h-8 w-full">
                        <Link href={`${viewBaseHref}/${user._id}` as Route}>View</Link>
                      </Button>
                      <Button asChild size="sm" className="h-8 w-full md:col-span-3">
                        <Link href={`${reportBaseHref}?employee=${encodeURIComponent(user.name)}` as Route}>Report</Link>
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="pb-2 dark:pb-0">
          <Button variant="outline" onClick={() => query.refetch()}>
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
