"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatDisplayName } from "@/lib/utils";
import { useState } from "react";

import { useSelectedCompany } from "@/hooks/use-selected-company";

import { useEffect } from "react";

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
  const selectedCompanyId = useSelectedCompany();
  const [selectedDept, setSelectedDept] = useState<string>("all");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("daily_report_selected_department");
      if (stored) setSelectedDept(stored);

      const handleDeptChange = (e: Event) => {
        const customEvent = e as CustomEvent<string>;
        if (customEvent.detail) setSelectedDept(customEvent.detail);
      };
      window.addEventListener("department-changed", handleDeptChange);
      return () => window.removeEventListener("department-changed", handleDeptChange);
    }
  }, []);

  const query = useQuery({
    queryKey: ["my-reports", selectedCompanyId, selectedDept],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (selectedCompanyId && selectedCompanyId !== "all") {
        queryParams.set("workspaceId", selectedCompanyId);
      }
      if (selectedDept && selectedDept !== "all" && selectedDept !== "All") {
        queryParams.set("team", selectedDept);
      }
      const url = `/api/reports/my?${queryParams.toString()}`;
      const response = await api.get(url);
      return response.data?.data as ReportItem[];
    }
  });

  const reports = query.data ?? [];
  const { data: sessionUser } = useQuery<any>({
    queryKey: ["session-user"],
    queryFn: async () => {
      const response = await api.get("/api/auth/me");
      return response.data?.data;
    }
  });
  const [editRequestModalOpen, setEditRequestModalOpen] = useState<string | null>(null);
  const [editReason, setEditReason] = useState("");
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const isTm = sessionUser?.role === "team_member";
  const routePrefix = isTm ? "/tm/daily-report" : "/daily-report";

  const submitEditRequest = async () => {
    if (!editRequestModalOpen || !editReason.trim()) return;
    setIsSubmittingEdit(true);
    try {
      await api.post(`/api/reports/${editRequestModalOpen}/edit-request`, { reason: editReason });
      await query.refetch();
    } finally {
      setIsSubmittingEdit(false);
      setEditRequestModalOpen(null);
      setEditReason("");
    }
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
              reports.map((report, idx) => {
                const reportId = report._id || (report as any).id || `my-report-${idx}`;
                return (
                  <div key={reportId} className="grid grid-cols-1 gap-3 px-4 py-4 text-sm md:grid-cols-12">
                    <div className="text-muted-foreground md:col-span-2">
                      <span className="mr-2 text-xs font-semibold uppercase tracking-[0.18em] md:hidden">Date</span>
                      {formatDate(report.reportDate)}
                    </div>
                    <div className="font-medium md:col-span-2">
                      <span className="mr-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground md:hidden">Team</span>
                      {formatDisplayName(report.teamName)}
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
                        <Link href={`${routePrefix}/${reportId}/preview` as any}>Preview</Link>
                      </Button>
                      {!report.isLocked ? (
                        report.canEdit ? (
                          <Button asChild size="sm" variant="outline" className="h-8">
                            <Link href={`${routePrefix}/${reportId}` as any}>Edit</Link>
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8"
                            disabled={Boolean(report.editAccessRequested)}
                            onClick={() => setEditRequestModalOpen(reportId)}
                          >
                            {report.editAccessRequested ? "Requested" : "Request Edit"}
                          </Button>
                        )
                      ) : null}
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

      {editRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold">Request Edit Access</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Please provide a reason for editing this submitted report. Your team senior will review this request.
            </p>
            <Textarea
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              placeholder="E.g., I forgot to add today's material utilization..."
              className="mb-4 min-h-[100px]"
            />
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setEditRequestModalOpen(null);
                  setEditReason("");
                }}
                disabled={isSubmittingEdit}
              >
                Cancel
              </Button>
              <Button onClick={submitEditRequest} disabled={!editReason.trim() || isSubmittingEdit}>
                {isSubmittingEdit ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
