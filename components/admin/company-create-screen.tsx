"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSelectedCompany } from "@/hooks/use-selected-company";
import { useSession } from "@/hooks/use-session";
import { useTranslation } from "@/lib/i18n";

interface CompanyCreateScreenProps {
  backHref: string;
  successHref: string;
}

async function safeFetchJson(res: Response) {
  const text = await res.text();
  if (!text || !text.trim()) {
    return { success: res.ok, data: null };
  }
  try {
    return JSON.parse(text);
  } catch {
    return { success: false, message: "Invalid JSON response from server" };
  }
}

export function CompanyCreateScreen({
  backHref,
  successHref,
}: CompanyCreateScreenProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const selectedCompanyId = useSelectedCompany();
  const { data: sessionUser } = useSession();
  const { t, isRtl } = useTranslation();
  const isAdmin = sessionUser?.role === "admin";

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState<"ceo" | "company">("company");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const activeCeoId = selectedCompanyId || "all";

  const createMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      code?: string;
      type: "ceo" | "company";
      description?: string;
      isActive: boolean;
    }) => {
      const res = await fetch(`/api/admin/companies?ceoId=${activeCeoId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-workspace-id": activeCeoId,
        },
        body: JSON.stringify(payload),
      });
      const json = await safeFetchJson(res);
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to create company");
      }
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-companies"] });
      queryClient.invalidateQueries({ queryKey: ["header-active-companies"] });
      router.push(successHref as Route);
    },
    onError: (err: Error) => {
      setFormError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError("Company name is required");
      return;
    }

    createMutation.mutate({
      name: name.trim(),
      code: code.trim(),
      type,
      description: description.trim(),
      isActive,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with Circular Back Button */}
      <div className="rounded-xl border border-cardBorder bg-card p-4 sm:p-5 shadow-soft">
        <div className="flex items-center gap-3">
          <Button asChild type="button" variant="outline" size="icon" className="h-9 w-9 rounded-xl shrink-0">
            <Link
              href={backHref as Route}
              title={t("companies.backToCompanies") || t("common.back")}
              aria-label={t("companies.backToCompanies") || t("common.back")}
            >
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            </Link>
          </Button>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              {t("companies.titleCreate")}
            </h2>
            <div className="mt-1 text-sm text-muted-foreground">
              {t("companies.descCreate")}
            </div>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="rounded-xl border border-cardBorder bg-card p-5 sm:p-6 shadow-soft">
        <div className="flex items-center gap-2 border-b pb-4 mb-5">
          <Building2 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold tracking-tight">
            {t("companies.organizationDetails")}
          </h3>
        </div>

        {formError && (
          <div className="mb-4 rounded-lg bg-rose-50 p-3 text-sm font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="companyName"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {t("companies.companyName")} <span className="text-rose-500">*</span>
              </label>
              <Input
                id="companyName"
                placeholder={t("companies.companyName")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label
                htmlFor="companyCode"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {t("companies.companyCode")} ({t("common.optional")})
              </label>
              <Input
                id="companyCode"
                placeholder={t("companies.companyCode")}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
          </div>

          {isAdmin && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("common.workspace")} Type
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
            <label
              htmlFor="companyDesc"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {t("companies.description")} ({t("common.optional")})
            </label>
            <Textarea
              id="companyDesc"
              rows={3}
              placeholder={t("companies.description")}
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
            <label
              htmlFor="isActiveToggle"
              className="text-sm font-medium text-foreground cursor-pointer"
            >
              {t("common.active")}
            </label>
          </div>

          <div className="flex items-center justify-end rtl:justify-start gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(backHref as Route)}
              disabled={createMutation.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <Loader2 className="mr-2 rtl:ml-2 rtl:mr-0 h-4 w-4 animate-spin" />
              ) : (
                <Building2 className="mr-2 rtl:ml-2 rtl:mr-0 h-4 w-4" />
              )}
              {createMutation.isPending ? t("common.creating") : t("companies.createCompany")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
