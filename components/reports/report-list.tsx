"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Route } from "next";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDate, formatDisplayName } from "@/lib/utils";
import { useSelectedCompany } from "@/hooks/use-selected-company";
import { useTranslation } from "@/lib/i18n";

type ReportItem = {
  _id: string;
  name: string;
  employeeRole?: string;
  teamName: string;
  reportType: string;
  reportDate: string;
  createdAt?: string;
  updatedAt?: string;
  submittedAt?: string;
  attachmentLink?: string;
  status: "draft" | "submitted" | "under_review" | "approved" | "rejected" | "locked";
  isLocked: boolean;
  editAccessRequested?: boolean;
  editAccessGranted?: boolean;
  completedWork: string;
  pendingWork: string;
  blockers: string;
};

export function ReportList({
  endpoint,
  title,
  detailBaseHref
}: {
  endpoint: string;
  title: string;
  detailBaseHref?: Route;
}) {
  const { t, isRtl } = useTranslation();
  const searchParams = useSearchParams();
  const selectedCompanyId = useSelectedCompany();
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [search, setSearch] = useState(searchParams.get("employee") ?? "");

  const formatRoleBadge = (role?: string) => {
    if (!role) return null;
    const normalized = role.toLowerCase().trim();
    return t(`roles.${normalized}`) || role.replace(/_/g, " ").toUpperCase();
  };

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("daily_report_selected_department") : null;
    if (stored) setSelectedDept(stored);

    const handleDeptChange = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) setSelectedDept(customEvent.detail);
    };

    window.addEventListener("department-changed", handleDeptChange);
    return () => window.removeEventListener("department-changed", handleDeptChange);
  }, []);

  const query = useQuery({
    queryKey: [endpoint, search, selectedCompanyId, selectedDept],
    queryFn: async () => {
      const response = await api.get(endpoint, {
        params: {
          employee: search || undefined,
          workspaceId: selectedCompanyId && selectedCompanyId !== "all" ? selectedCompanyId : undefined,
          team: selectedDept && selectedDept !== "all" ? selectedDept : undefined
        }
      });
      return response.data?.data as ReportItem[];
    }
  });

  const reports = useMemo(() => {
    const raw = query.data ?? [];
    if (!search || !search.trim()) return raw;
    const q = search.trim().toLowerCase();
    return raw.filter((r) => {
      const nameMatch = r.name?.toLowerCase().includes(q);
      const teamMatch = r.teamName?.toLowerCase().includes(q);
      const roleMatch = (r.employeeRole || "").toLowerCase().includes(q);
      const statusMatch = (r.status || "").toLowerCase().includes(q);
      return nameMatch || teamMatch || roleMatch || statusMatch;
    });
  }, [query.data, search]);

  const allowEdit = async (reportId: string) => {
    await api.patch(`/api/report-manager/reports/${reportId}/edit-access`);
    await query.refetch();
  };

  return (
    <Card className="border-none shadow-none">
      <CardContent className="space-y-4 p-0 px-4 pb-4 dark:px-0 dark:pb-0">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="w-full md:max-w-sm">
            <div className="mb-1 text-sm font-medium text-foreground">{t("common.search")}</div>
            <div className="relative">
              <Search className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ${isRtl ? "right-3" : "left-3"}`} />
              <Input
                className={isRtl ? "pr-9 pl-3 text-right" : "pl-9 pr-3"}
                placeholder={`${t("common.search")} ${title.toLowerCase()}`}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
          <Badge variant="soft">{reports.length} {t("nav.reports")}</Badge>
        </div>

        <div className="overflow-hidden rounded-xl border border-cardBorder">
          <div className="hidden grid-cols-12 gap-3 border-b bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground md:grid">
            <div className="col-span-2">{t("common.date")}</div>
            <div className="col-span-3">{t("common.name")}</div>
            <div className="col-span-2">{t("common.team")}</div>
            <div className="col-span-3">{t("common.status")}</div>
            <div className="col-span-2 text-right rtl:text-left">{t("common.actions")}</div>
          </div>
          <div className="divide-y">
            {query.isLoading ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">{t("common.loading")}</div>
            ) : query.isError ? (
              <div className="px-4 py-6 text-sm text-danger">{t("common.somethingWentWrong")}</div>
            ) : reports.length === 0 ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">{t("reports.noReportsSubmitted")}</div>
            ) : (
              reports.map((report, idx) => {
                const reportId = report._id || (report as any).id || `report-${idx}`;
                return (
                  <div key={reportId} className="grid grid-cols-1 gap-3 px-4 py-4 text-sm md:grid-cols-12 items-center">
                    <div className="text-muted-foreground md:col-span-2">
                      <span className="mr-2 rtl:ml-2 rtl:mr-0 text-xs font-semibold uppercase tracking-[0.18em] md:hidden">{t("common.date")}</span>
                      {formatDate(report.reportDate || report.updatedAt || report.createdAt || report.submittedAt || new Date())}
                    </div>
                    <div className="font-medium md:col-span-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {detailBaseHref ? (
                          <Link className="text-primary hover:text-primary/80 font-semibold" href={`${detailBaseHref}/${reportId}` as Route}>
                            {report.name}
                          </Link>
                        ) : (
                          <span className="font-semibold">{report.name}</span>
                        )}
                        {report.employeeRole && (
                          <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider py-0 px-1.5 h-4">
                            {formatRoleBadge(report.employeeRole)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-muted-foreground md:col-span-2">
                      <span className="mr-2 rtl:ml-2 rtl:mr-0 text-xs font-semibold uppercase tracking-[0.18em] md:hidden">{t("common.team")}</span>
                      {formatDisplayName(report.teamName)}
                    </div>
                    <div className="space-y-1.5 md:col-span-3">
                      <div>
                        <Badge
                          variant={
                            report.status === "approved"
                              ? "soft"
                              : report.status === "rejected"
                                ? "outline"
                                : "default"
                          }
                        >
                          {report.status === "approved" ? t("reports.approved") : report.status === "rejected" ? t("reports.rejected") : (report.status as string) === "pending" || report.status === "under_review" ? t("reports.pending") : formatDisplayName(report.status)}
                        </Badge>
                      </div>
                      {report.editAccessRequested || report.editAccessGranted ? (
                        <div className="flex flex-wrap gap-1.5">
                          {report.editAccessRequested ? <Badge variant="outline">{t("reports.editAccessRequested")}</Badge> : null}
                          {report.editAccessGranted ? <Badge variant="soft">{t("reports.editAccessGranted")}</Badge> : null}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2 md:col-span-2 justify-end rtl:justify-start">
                      {report.editAccessRequested && !report.editAccessGranted && !report.isLocked ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 border-amber-200 bg-amber-50 px-3 text-amber-800 hover:bg-amber-100 hover:text-amber-900"
                          onClick={() => allowEdit(reportId)}
                        >
                          {t("reports.approveEdit")}
                        </Button>
                      ) : null}
                      {detailBaseHref ? (
                        <Button asChild size="sm" variant="outline" className="h-8 px-3">
                          <Link href={`${detailBaseHref}/${reportId}` as Route}>{t("reports.viewReport")}</Link>
                        </Button>
                      ) : report.attachmentLink ? (
                        <a
                          className="text-sm font-medium text-primary hover:text-primary/80"
                          href={report.attachmentLink}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {t("reports.viewAttachmentLink")}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="pb-2 dark:pb-0">
          <Button variant="outline" onClick={() => query.refetch()}>
            {t("common.refresh")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
