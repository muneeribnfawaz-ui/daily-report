"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

type ReportItem = {
  _id: string;
  name: string;
  teamName: string;
  reportType: string;
  reportDate: string;
  attachmentLink?: string;
  isLocked: boolean;
  canEdit: boolean;
  editAccessRequested?: boolean;
};

export function MyReportList() {
  const query = useQuery({
    queryKey: ["my-reports"],
    queryFn: async () => {
      const response = await api.get("/api/reports/my");
      return response.data?.data as ReportItem[];
    }
  });

  const reports = query.data ?? [];
  const requestEditAccess = async (reportId: string) => {
    await api.post(`/api/reports/${reportId}/edit-request`, {});
    await query.refetch();
  };

  return (
    <Card className="border-none shadow-none">
      <CardContent className="space-y-4 p-0 px-4 pb-4 dark:px-0 dark:pb-0">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">Only your submitted reports are shown here.</div>
          <Badge variant="soft">{reports.length} reports</Badge>
        </div>

        <div className="overflow-hidden rounded-xl border border-cardBorder">
          <div className="hidden grid-cols-12 gap-3 border-b bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground md:grid">
            <div className="col-span-2">Date</div>
            <div className="col-span-2">Team</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-3">Attachment</div>
            <div className="col-span-3">Action</div>
          </div>

          <div className="divide-y">
            {query.isLoading ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">Loading reports...</div>
            ) : query.isError ? (
              <div className="px-4 py-6 text-sm text-danger">Failed to load reports.</div>
            ) : reports.length === 0 ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">No reports found.</div>
            ) : (
              reports.map((report) => (
                <div key={report._id} className="grid grid-cols-1 gap-3 px-4 py-4 text-sm md:grid-cols-12">
                  <div className="text-muted-foreground md:col-span-2">
                    <span className="mr-2 text-xs font-semibold uppercase tracking-[0.18em] md:hidden">Date</span>
                    {formatDate(report.reportDate)}
                  </div>
                  <div className="font-medium md:col-span-2">
                    <span className="mr-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground md:hidden">Team</span>
                    {report.teamName}
                  </div>
                  <div className="text-muted-foreground md:col-span-2">
                    <span className="mr-2 text-xs font-semibold uppercase tracking-[0.18em] md:hidden">Type</span>
                    {report.reportType}
                  </div>
                  <div className="md:col-span-3">
                    <span className="mr-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground md:hidden">Attachment</span>
                    {report.attachmentLink ? (
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
                  <div className="flex flex-wrap gap-2 md:col-span-3">
                    <Button asChild size="sm" variant="outline" className="h-8">
                      <Link href={`/daily-report/${report._id}/preview`}>Preview</Link>
                    </Button>
                    {!report.isLocked ? (
                      report.canEdit ? (
                        <Button asChild size="sm" variant="outline" className="h-8">
                          <Link href={`/daily-report/${report._id}`}>Edit</Link>
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8"
                          disabled={Boolean(report.editAccessRequested)}
                          onClick={() => requestEditAccess(report._id)}
                        >
                          {report.editAccessRequested ? "Requested" : "Request Edit"}
                        </Button>
                      )
                    ) : null}
                  </div>
                </div>
              ))
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
