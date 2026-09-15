"use client";

import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompaniesManager } from "@/components/admin/companies-manager";
import { useTranslation } from "@/lib/i18n";

export function AdminCompaniesContent() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Header Info Card with Circular Back Button */}
      <div className="rounded-xl border border-cardBorder bg-card p-4 sm:p-5 shadow-soft">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="icon" className="shrink-0">
            <Link href={"/admin/dashboard" as Route} title={t("common.back")} aria-label={t("common.back")}>
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            </Link>
          </Button>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{t("companies.titleManagement")}</h2>
            <div className="mt-1 text-sm text-muted-foreground">
              {t("companies.managementDesc")}
            </div>
          </div>
        </div>
      </div>

      <CompaniesManager />
    </div>
  );
}
