"use client";

import { useState } from "react";
import { MyReportList } from "@/components/reports/my-report-list";
import { ConsolidatedReportBrowser } from "@/components/consolidated/consolidated-report-browser";

type TmReportsViewProps = {
  userPrimaryDept?: string;
  enrolledDepartments: string[];
  enrolledTeams: string[];
  userRole: string;
};

export function TmReportsView({
  userPrimaryDept,
  enrolledDepartments,
  enrolledTeams,
  userRole
}: TmReportsViewProps) {
  const [view, setView] = useState<"submissions" | "consolidated">("submissions");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-1 rounded-xl bg-muted/60 p-1 text-sm border border-border/50 w-fit">
        <button
          type="button"
          onClick={() => setView("submissions")}
          className={`rounded-lg px-4 py-2 font-medium transition-colors ${
            view === "submissions"
              ? "bg-background text-foreground shadow-sm font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          My Submissions
        </button>
        <button
          type="button"
          onClick={() => setView("consolidated")}
          className={`rounded-lg px-4 py-2 font-medium transition-colors ${
            view === "consolidated"
              ? "bg-background text-foreground shadow-sm font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Consolidated Reports
        </button>
      </div>

      {view === "submissions" ? (
        <MyReportList />
      ) : (
        <ConsolidatedReportBrowser
          endpoint="/api/consolidated-reports"
          detailBaseHref="/consolidated-reports"
          userDepartment={userPrimaryDept}
          enrolledDepartments={enrolledDepartments}
          enrolledTeams={enrolledTeams}
          userRole={userRole}
          mine={true}
        />
      )}
    </div>
  );
}
