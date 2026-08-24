"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { DEPARTMENT_OPTIONS } from "@/lib/constants";

type ConsolidatedReportSummaryItem = {
  date: string;
  reportCount: number;
  teamNames: string[];
};

function formatDateOnly(value: string | Date) {
  const normalizedValue =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
  const date = new Date(normalizedValue);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function ConsolidatedReportBrowser({
  endpoint,
  detailBaseHref,
  userDepartment,
  enrolledDepartments = [],
  userRole
}: {
  endpoint: string;
  detailBaseHref: string;
  userDepartment?: string;
  enrolledDepartments?: string[];
  userRole?: string;
}) {
  const isUnrestrictedRole = userRole === "admin" || userRole === "ceo";

  const availableDepartmentOptions = useMemo(() => {
    if (isUnrestrictedRole || !enrolledDepartments || enrolledDepartments.length === 0) {
      return Array.from(DEPARTMENT_OPTIONS);
    }
    return enrolledDepartments;
  }, [isUnrestrictedRole, enrolledDepartments]);

  const initialDepartment = useMemo(() => {
    if (userDepartment && availableDepartmentOptions.includes(userDepartment)) {
      return userDepartment;
    }
    if (!isUnrestrictedRole && availableDepartmentOptions.length > 0) {
      return availableDepartmentOptions[0];
    }
    return "All";
  }, [userDepartment, availableDepartmentOptions, isUnrestrictedRole]);

  const [department, setDepartment] = useState<string>(initialDepartment);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("daily_report_selected_company");
      if (stored) setSelectedCompanyId(stored);

      const handleCompanyChange = (e: any) => {
        setSelectedCompanyId(e.detail);
      };
      window.addEventListener("company-changed", handleCompanyChange);
      return () => window.removeEventListener("company-changed", handleCompanyChange);
    }
  }, []);

  const summaryQuery = useQuery({
    queryKey: [endpoint, "summary", department, selectedCompanyId],
    queryFn: async () => {
      const response = await api.get(endpoint, {
        params: {
          ...(department !== "All" ? { department } : {}),
          ...(selectedCompanyId ? { workspaceId: selectedCompanyId } : {})
        }
      });
      return response.data?.data as ConsolidatedReportSummaryItem[];
    }
  });

  const summaryReports = useMemo(() => summaryQuery.data ?? [], [summaryQuery.data]);

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-none">
        <CardContent className="space-y-4 p-0 px-4 pb-4 dark:px-0 dark:pb-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-sm text-muted-foreground">Consolidated reports by date</div>
              <Badge variant="soft">{summaryReports.length} date{summaryReports.length === 1 ? "" : "s"}</Badge>
              {userDepartment && (
                <Badge variant="outline" className="border-primary/30 text-primary">
                  Enrolled Dept: {userDepartment}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="department-filter" className="text-sm text-muted-foreground whitespace-nowrap">
                Department:
              </label>
              <Select
                id="department-filter"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full sm:w-[200px]"
                disabled={!isUnrestrictedRole && availableDepartmentOptions.length === 1}
              >
                {(isUnrestrictedRole || availableDepartmentOptions.length > 1) && (
                  <option value="All">
                    {isUnrestrictedRole ? "All Departments" : "All Enrolled Depts"}
                  </option>
                )}
                {availableDepartmentOptions.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-cardBorder pb-2">
            <div className="grid grid-cols-[1fr_auto] gap-3 border-b bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              <div>Date</div>
              <div>Action</div>
            </div>

            <div className="divide-y">
              {summaryQuery.isLoading ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">Loading consolidated report dates...</div>
              ) : summaryQuery.isError ? (
                <div className="px-4 py-6 text-sm text-danger">Failed to load consolidated report dates.</div>
              ) : summaryReports.length === 0 ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">No consolidated reports found.</div>
              ) : (
                summaryReports.map((report) => (
                  <div key={report.date} className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-4 text-sm">
                    <div className="space-y-1">
                      <div className="inline-flex w-fit rounded-full bg-muted px-3 py-1 text-sm font-semibold text-textPrimary">
                        {formatDateOnly(report.date)}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="rounded-full">
                          {report.reportCount} report{report.reportCount === 1 ? "" : "s"}
                        </Badge>
                        <Badge variant="outline" className="rounded-full">
                          {report.teamNames.length} team{report.teamNames.length === 1 ? "" : "s"}
                        </Badge>
                      </div>
                    </div>
                    <Button asChild size="sm" className="h-8">
                      <Link href={`${detailBaseHref}/${report.date}${department !== "All" ? `?department=${department}` : ""}` as Route}>View Preview</Link>
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
