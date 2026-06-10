"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type TeamTypeRecord = {
  _id: string;
  name: string;
  showName?: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt?: string;
  createdBy?: string;
};

export function TeamTypesManager() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data, isLoading, isError } = useQuery<TeamTypeRecord[]>({
    queryKey: ["admin-team-types"],
    queryFn: async () => {
      const response = await api.get("/api/admin/team-types");
      return (response.data?.data as TeamTypeRecord[]) ?? [];
    },
    refetchOnMount: "always",
    refetchOnWindowFocus: true
  });

  const teamTypes = useMemo(() => data ?? [], [data]);
  const visibleTeamTypes = useMemo(() => {
    if (!search.trim()) return teamTypes;
    const query = search.toLowerCase();
    return teamTypes.filter((teamType) => {
      const showName = teamType.showName?.toLowerCase() ?? teamType.name.toLowerCase();
      return (
        showName.includes(query) ||
        teamType.name.toLowerCase().includes(query) ||
        (teamType.createdBy ?? "").toLowerCase().includes(query)
      );
    });
  }, [search, teamTypes]);

  return (
    <Card className="border-none shadow-none">
      <CardContent className="space-y-4 p-0 px-4 pb-4 dark:px-0 dark:pb-0">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="w-full md:max-w-sm">
            <div className="mb-1 text-sm font-medium text-foreground">Search team types</div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search show name, internal name, or creator"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="soft">{visibleTeamTypes.length} team types</Badge>
            <Button asChild>
              <Link href="/admin/team-types/create">Create Team Type</Link>
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-cardBorder">
          <div className="grid grid-cols-12 gap-3 border-b bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            <div className="col-span-3">Show Name</div>
            <div className="col-span-3">Internal Name</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Created By</div>
            <div className="col-span-2">Created At</div>
          </div>
          <div className="divide-y">
            {isLoading ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">Loading team types...</div>
            ) : isError ? (
              <div className="px-4 py-6 text-sm text-danger">Failed to load team types.</div>
            ) : visibleTeamTypes.length === 0 ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">No team types found.</div>
            ) : (
              visibleTeamTypes.map((teamType) => (
                <div key={teamType._id} className="grid grid-cols-12 gap-3 px-4 py-4 text-sm">
                  <div className="col-span-3 font-medium">{teamType.showName || teamType.name}</div>
                  <div className="col-span-3 text-muted-foreground">{teamType.name}</div>
                  <div className="col-span-2">
                    <Badge variant={teamType.isActive ? "soft" : "outline"}>
                      {teamType.isDeleted ? "Deleted" : teamType.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="col-span-2 text-muted-foreground">{teamType.createdBy || "N/A"}</div>
                  <div className="col-span-2 text-muted-foreground">
                    {teamType.createdAt ? new Date(teamType.createdAt).toLocaleDateString() : "N/A"}
                  </div>
                  <div className="col-span-12 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <div>{teamType.isDeleted ? "Deleted teams stay hidden from selection." : null}</div>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/team-types/${teamType._id}/edit`}>Edit</Link>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={async () => {
                          await api.delete(`/api/admin/team-types/${teamType._id}`);
                          await queryClient.invalidateQueries({ queryKey: ["admin-team-types"] });
                          await queryClient.invalidateQueries({ queryKey: ["team-types"] });
                        }}
                        disabled={teamType.isDeleted}
                      >
                        {teamType.isDeleted ? "Deleted" : "Delete"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="pb-2 dark:pb-0">
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-team-types"] })}>
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
