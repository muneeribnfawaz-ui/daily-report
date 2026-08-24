"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, Edit2, CheckCircle, XCircle, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  const searchParams = useSearchParams();
  const selectedCompanyId = useSelectedCompany();
  const { data: sessionUser } = useSession();
  const isAdmin = sessionUser?.role === "admin";
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("create") === "true" || searchParams.get("action") === "create") {
      setIsCreateOpen(true);
    }
  }, [searchParams]);

  const [editingCompany, setEditingCompany] = useState<CompanyItem | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState<"ceo" | "company">("company");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [formError, setFormError] = useState<string | null>(null);

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

  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; code?: string; type: "ceo" | "company"; description?: string; isActive: boolean }) => {
      const res = await fetch(`/api/admin/companies?ceoId=${activeCeoId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-workspace-id": activeCeoId
        },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to create company");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-companies"] });
      resetForm();
    },
    onError: (err: Error) => {
      setFormError(err.message);
    }
  });

  const updateMutation = useMutation({
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
      resetForm();
    },
    onError: (err: Error) => {
      setFormError(err.message);
    }
  });

  const resetForm = () => {
    setName("");
    setCode("");
    setType("company");
    setDescription("");
    setIsActive(true);
    setFormError(null);
    setIsCreateOpen(false);
    setEditingCompany(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (comp: CompanyItem) => {
    resetForm();
    setEditingCompany(comp);
    setName(comp.name);
    setCode(comp.code || "");
    setType(comp.type || "company");
    setDescription(comp.description || "");
    setIsActive(comp.isActive);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError("Company name is required");
      return;
    }

    if (editingCompany) {
      updateMutation.mutate({
        id: editingCompany._id,
        payload: { name: name.trim(), code: code.trim(), type, description: description.trim(), isActive }
      });
    } else {
      createMutation.mutate({
        name: name.trim(),
        code: code.trim(),
        type,
        description: description.trim(),
        isActive
      });
    }
  };

  const handleToggleStatus = (comp: CompanyItem) => {
    updateMutation.mutate({
      id: comp._id,
      payload: { isActive: !comp.isActive }
    });
  };

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.code && c.code.toLowerCase().includes(search.toLowerCase())) ||
    (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  );

  const isSaving = createMutation.isPending || updateMutation.isPending;

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
        <Button onClick={handleOpenCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" /> Add Company
        </Button>
      </div>

      {/* Modal / Inline Form Card */}
      {(isCreateOpen || editingCompany) && (
        <div className="rounded-xl border border-cardBorder bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between border-b pb-3 mb-4">
            <h3 className="text-lg font-semibold tracking-tight">
              {editingCompany ? `Edit Company: ${editingCompany.name}` : "Create New Company"}
            </h3>
            <Button variant="ghost" size="sm" onClick={resetForm}>
              Cancel
            </Button>
          </div>

          {formError && (
            <div className="mb-4 rounded-lg bg-rose-50 p-3 text-sm font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="companyName" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Company Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  id="companyName"
                  placeholder="e.g. MIF Technology Ltd"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="companyCode" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Company Code (Optional)
                </label>
                <Input
                  id="companyCode"
                  placeholder="e.g. MIFT"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
            </div>

            {isAdmin && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Workspace Type
                </label>
                <div className="flex items-center gap-6 pt-1">
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
                    <input
                      type="radio"
                      name="workspaceType"
                      value="company"
                      checked={type === "company"}
                      onChange={() => setType("company")}
                      className="h-4 w-4 text-primary focus:ring-primary"
                    />
                    <span>Company Workspace</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
                    <input
                      type="radio"
                      name="workspaceType"
                      value="ceo"
                      checked={type === "ceo"}
                      onChange={() => setType("ceo")}
                      className="h-4 w-4 text-primary focus:ring-primary"
                    />
                    <span>CEO Workspace</span>
                  </label>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="companyDesc" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Description (Optional)
              </label>
              <Textarea
                id="companyDesc"
                rows={2}
                placeholder="Enter details about this organization or entity..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isActiveToggle"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="isActiveToggle" className="text-sm font-medium text-foreground cursor-pointer">
                Active Organization Status
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" size="sm" onClick={resetForm} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingCompany ? "Update Company" : "Create Company"}
              </Button>
            </div>
          </form>
        </div>
      )}

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
                    {comp.type === "ceo" ? (
                      <Badge variant="soft" className="bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                        CEO Workspace
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        Company Workspace
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
                  <Button variant="outline" size="sm" onClick={() => handleOpenEdit(comp)}>
                    <Edit2 className="mr-1.5 h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleStatus(comp)}
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
