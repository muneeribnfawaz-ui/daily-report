"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";

type ReportItem = {
  _id: string;
  name: string;
  teamName: string;
  reportType: string;
  reportDate: string;
  status: "draft" | "submitted" | "under_review" | "approved" | "rejected" | "locked";
  isLocked: boolean;
  editAccessRequested?: boolean;
  editAccessGranted?: boolean;
  attachmentLink?: string;
};

type ReportDateGroup = {
  date: string;
  reportCount: number;
  teamNames: string[];
  reports: ReportItem[];
};

type PaginatedReportResponse = {
  items: ReportDateGroup[];
  page: number;
  limit: number;
  totalDates: number;
  totalPages: number;
};

const PAGE_SIZE = 1;

export function ReportDateList({
  endpoint,
  title,
  detailBaseHref
}: {
  endpoint: string;
  title: string;
  detailBaseHref?: Route;
}) {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("employee") ?? "");
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: [endpoint, search, page],
    queryFn: async () => {
      const response = await api.get(endpoint, {
        params: {
          view: "date-paginated",
          employee: search || undefined,
          page,
          limit: PAGE_SIZE
        }
      });
      return response.data?.data as PaginatedReportResponse;
    }
  });

  const currentGroup = query.data?.items?.[0] ?? null;
  const totalPages = query.data?.totalPages ?? 0;
  const totalDates = query.data?.totalDates ?? 0;
  const currentPage = query.data?.page ?? page;

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const allowEdit = async (reportId: string) => {
    await api.patch(`/api/report-manager/reports/${reportId}/edit-access`);
    await query.refetch();
  };

  return (
    <Card className="border-none shadow-none">
      <CardContent className="space-y-5 p-0 px-4 pb-4 dark:px-0 dark:pb-0">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="w-full md:max-w-sm">
            <div className="mb-1 text-sm font-medium text-foreground">Search {title.toLowerCase()}</div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={`Search ${title.toLowerCase()}`}
                value={search}
                onChange={(event) => handleSearchChange(event.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="soft">{totalDates} date{totalDates === 1 ? "" : "s"}</Badge>
            <Badge variant="outline">
              Page {currentPage || 1} of {totalPages || 1}
            </Badge>
          </div>
        </div>

        <div className="rounded-xl border border-cardBorder bg-muted/20 px-4 py-4">
          {query.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading reports...</div>
          ) : query.isError ? (
            <div className="text-sm text-danger">Failed to load reports.</div>
          ) : currentGroup ? (
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="inline-flex w-fit rounded-full bg-background px-3 py-1 text-sm font-semibold text-textPrimary">
                  {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(`${currentGroup.date}T00:00:00`))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="rounded-full">
                    {currentGroup.reportCount} report{currentGroup.reportCount === 1 ? "" : "s"}
                  </Badge>
                  <Badge variant="outline" className="rounded-full">
                    {currentGroup.teamNames.length} team{currentGroup.teamNames.length === 1 ? "" : "s"}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {currentGroup.teamNames.map((teamName) => (
                  <Badge key={teamName} variant="soft" className="rounded-full">
                    {teamName}
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No reports found.</div>
          )}
        </div>

        <div className="space-y-4">
          {query.isLoading ? (
            <div className="rounded-xl border border-cardBorder px-4 py-6 text-sm text-muted-foreground">Loading reports...</div>
          ) : query.isError ? (
            <div className="rounded-xl border border-cardBorder px-4 py-6 text-sm text-danger">Failed to load reports.</div>
          ) : !currentGroup ? (
            <div className="rounded-xl border border-cardBorder px-4 py-6 text-sm text-muted-foreground">No reports found.</div>
          ) : (
            <Card className="overflow-hidden border border-cardBorder">
              <CardContent className="p-0">
                <div className="hidden grid-cols-12 gap-3 border-b bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground md:grid">
                  <div className="col-span-2">Date</div>
                  <div className="col-span-3">Employee</div>
                  <div className="col-span-2">Team</div>
                  <div className="col-span-3">Status</div>
                  <div className="col-span-2">Action</div>
                </div>
                <div className="divide-y">
                  {currentGroup.reports.map((report) => (
                    <div key={report._id} className="grid grid-cols-1 gap-3 px-4 py-4 text-sm md:grid-cols-12">
                      <div className="text-muted-foreground md:col-span-2">
                        <span className="mr-2 text-xs font-semibold uppercase tracking-[0.18em] md:hidden">Date</span>
                        {formatDate(report.reportDate)}
                      </div>
                      <div className="font-medium md:col-span-3">
                        {detailBaseHref ? (
                          <Link className="text-primary hover:text-primary/80" href={`${detailBaseHref}/${report._id}` as Route}>
                            {report.name}
                          </Link>
                        ) : (
                          report.name
                        )}
                      </div>
                      <div className="text-muted-foreground md:col-span-2">
                        <span className="mr-2 text-xs font-semibold uppercase tracking-[0.18em] md:hidden">Team</span>
                        {report.teamName}
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
                            {report.status}
                          </Badge>
                        </div>
                        {report.editAccessRequested || report.editAccessGranted ? (
                          <div className="flex flex-wrap gap-1.5">
                            {report.editAccessRequested ? <Badge variant="outline">Edit requested</Badge> : null}
                            {report.editAccessGranted ? <Badge variant="soft">Edit enabled</Badge> : null}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2 md:col-span-2">
                        {report.editAccessRequested && !report.editAccessGranted && !report.isLocked ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 border-amber-200 bg-amber-50 px-3 text-amber-800 hover:bg-amber-100 hover:text-amber-900"
                            onClick={() => allowEdit(report._id)}
                          >
                            Allow Edit
                          </Button>
                        ) : null}
                        {detailBaseHref ? (
                          <Button asChild size="sm" variant="outline" className="h-8 px-3">
                            <Link href={`${detailBaseHref}/${report._id}` as Route}>Open</Link>
                          </Button>
                        ) : report.attachmentLink ? (
                          <a
                            className="text-sm font-medium text-primary hover:text-primary/80"
                            href={report.attachmentLink}
                            rel="noreferrer"
                            target="_blank"
                          >
                            Open
                          </a>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={currentPage <= 1 || query.isLoading}>
            Previous
          </Button>
          <div className="text-sm text-muted-foreground">
            Page {currentPage || 1} of {totalPages || 1}
          </div>
          <Button
            variant="outline"
            onClick={() => setPage((current) => current + 1)}
            disabled={totalPages === 0 || currentPage >= totalPages || query.isLoading}
          >
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
