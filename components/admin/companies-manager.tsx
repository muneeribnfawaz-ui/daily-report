"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, Edit2, CheckCircle, XCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useSelectedCompany } from "@/hooks/use-selected-company";
import { useSession } from "@/hooks/use-session";

type CompanyItem = {
  _id: string;
  name: string;
  code?: string;
  type?: "ceo" | "company";
  description?: string;
  isActive: boolean;
  createdBy?: string;
  createdAt?: string;
};

export function CompaniesManager() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedCompanyId = useSelectedCompany();
  const { data: sessionUser } = useSession();
  const isCeo = sessionUser?.role === "ceo";
  const createHref = isCeo ? "/ceo/companies/create" : "/admin/companies/create";
  const getEditHref = (id: string) => isCeo ? `/ceo/companies/${id}/edit` : `/admin/companies/${id}/edit`;

  const [search, setSearch] = useState("");

  useEffect(() => {
    if (searchParams.get("create") === "true" || searchParams.get("action") === "create") {
      router.push(createHref as Route);
    }
  }, [searchParams, router, createHref]);

  const activeCeoId = selectedCompanyId || "all";

  const { data: companies = [], isLoading, isError } = useQuery<CompanyItem[]>({
    queryKey: ["admin-companies", activeCeoId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/companies?ceoId=${activeCeoId}`, {
        headers: { "x-workspace-id": activeCeoId }
      });
      if (!res.ok) throw new Error("Failed to fetch companies");
      const json = await res.json();
      return json.data as CompanyItem[];
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<CompanyItem> }) => {
      const res = await fetch(`/api/admin/companies/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to update company");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-companies"] });
    }
  });

  const handleToggleStatus = (comp: CompanyItem) => {
    toggleStatusMutation.mutate({
      id: comp._id,
      payload: { isActive: !comp.isActive }
    });
  };

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.code && c.code.toLowerCase().includes(search.toLowerCase())) ||
    (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search companies by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button asChild size="sm">
          <Link href={createHref as Route}>
            <Plus className="mr-2 h-4 w-4" /> Add Company
          </Link>
        </Button>
      </div>

      {/* Companies List */}
      <div className="overflow-hidden rounded-xl border border-cardBorder bg-card shadow-soft">
        <div className="border-b bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-3 text-white flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <Building2 className="h-4 w-4" />
            <span>Companies Directory</span>
          </div>
          <Badge variant="outline" className="border-white/20 text-white">
            {filteredCompanies.length} company{filteredCompanies.length === 1 ? "" : "ies"}
          </Badge>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading companies...</div>
        ) : isError ? (
          <div className="p-8 text-center text-sm text-rose-500">Failed to load companies.</div>
        ) : filteredCompanies.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {search ? "No companies matched your search criteria." : "No companies added yet. Click 'Add Company' to create one."}
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filteredCompanies.map((comp) => (
              <div key={comp._id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/10 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-base">{comp.name}</span>
                    {comp.code && (
                      <Badge variant="soft" className="font-mono text-xs">
                        {comp.code}
                      </Badge>
                    )}
                    {comp.type === "ceo" && (
                      <Badge variant="soft" className="bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                        CEO Workspace
                      </Badge>
                    )}
                    {comp.isActive ? (
                      <Badge variant="soft" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <CheckCircle className="mr-1 h-3 w-3" /> Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        <XCircle className="mr-1 h-3 w-3" /> Inactive
                      </Badge>
                    )}
                  </div>
                  {comp.description && (
                    <p className="text-sm text-muted-foreground">{comp.description}</p>
                  )}
                  {comp.createdBy && (
                    <div className="text-xs text-muted-foreground/80">Created by {comp.createdBy}</div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button asChild variant="outline" size="sm">
                    <Link href={getEditHref(comp._id) as Route}>
                      <Edit2 className="mr-1.5 h-3.5 w-3.5" /> Edit
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleStatus(comp)}
                    disabled={toggleStatusMutation.isPending}
                    className={comp.isActive ? "text-rose-600 hover:text-rose-700 hover:bg-rose-50" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"}
                  >
                    {comp.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
