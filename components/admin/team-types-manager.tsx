"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Search, Edit2 } from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TeamTypeForm } from "@/components/admin/team-type-form";

type TeamTypeRecord = {
  _id: string;
  name: string;
  showName?: string;
  department?: string;
  subTeams?: string[];
  isActive: boolean;
  isDeleted: boolean;
  createdAt?: string;
  createdBy?: string;
};

export function TeamTypesManager() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeModal, setActiveModal] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

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
      const department = teamType.department?.toLowerCase() ?? "";
      return (
        showName.includes(query) ||
        department.includes(query) ||
        teamType.name.toLowerCase().includes(query) ||
        (teamType.createdBy ?? "").toLowerCase().includes(query)
      );
    });
  }, [search, teamTypes]);

  const handleSaved = () => {
    setActiveModal(null);
    setEditingId(null);
    queryClient.invalidateQueries({ queryKey: ["admin-team-types"] });
    queryClient.invalidateQueries({ queryKey: ["team-types"] });
  };

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
                placeholder="Search team name, department, or creator"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="soft">{visibleTeamTypes.length} team types</Badge>
            <Button
              onClick={() => {
                setEditingId(null);
                setActiveModal("create");
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Create Team Type
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-cardBorder">
          <div className="grid grid-cols-12 gap-3 border-b bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            <div className="col-span-3">Show Name</div>
            <div className="col-span-3">Department</div>
            <div className="col-span-2">Internal Name</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2 text-right">Actions</div>
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
                <div key={teamType._id} className="grid grid-cols-12 items-center gap-3 px-4 py-4 text-sm">
                  <div className="col-span-3 font-medium">
                    <div>{teamType.showName || teamType.name}</div>
                  </div>
                  <div className="col-span-3">
                    {teamType.department ? (
                      <div className="flex flex-wrap items-center gap-1">
                        <Badge variant="outline">{teamType.department}</Badge>
                        {teamType.subTeams && teamType.subTeams.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {teamType.subTeams.map((sub) => (
                              <Badge key={sub} variant="soft" className="text-[10px] px-1 py-0 h-4">
                                {sub}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Unassigned</span>
                    )}
                  </div>
                  <div className="col-span-2 text-muted-foreground text-xs font-mono">{teamType.name}</div>
                  <div className="col-span-2">
                    <Badge variant={teamType.isActive ? "soft" : "outline"}>
                      {teamType.isDeleted ? "Deleted" : teamType.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingId(teamType._id);
                        setActiveModal("edit");
                      }}
                    >
                      <Edit2 className="mr-1 h-3.5 w-3.5" /> Edit
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 pb-2 dark:pb-0">
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-team-types"] })}>
            Refresh
          </Button>
        </div>
      </CardContent>

      {activeModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-semibold text-foreground">
                {activeModal === "create" ? "Create New Team Type" : "Edit Team Type"}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setActiveModal(null)}>
                ✕
              </Button>
            </div>
            <TeamTypeForm
              mode={activeModal === "edit" ? "edit" : "create"}
              teamTypeId={editingId ?? undefined}
              onSaved={handleSaved}
              onCancel={() => setActiveModal(null)}
            />
          </div>
        </div>
      )}
    </Card>
  );
}

