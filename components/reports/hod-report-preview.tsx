"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

export function HodReportPreview({ previewDate }: { previewDate: string }) {
  const { t } = useTranslation();
  const { data: reports, isLoading } = useQuery({
    queryKey: ["hod-preview-reports", previewDate],
    queryFn: async () => {
      const response = await api.get(`/api/reports/my?date=${previewDate}`);
      return response.data?.data || [];
    }
  });

  if (isLoading) return <div className="p-4">{t("common.loading")}</div>;
  if (!reports || reports.length === 0) return <div className="p-4 text-muted-foreground">{t("reports.noReportsSubmitted")}</div>;

  // Use the latest createdAt for display time
  let submissionTime = reports[0].reportDate;
  let maxTime = 0;
  let attachmentLink = "";

  for (const r of reports) {
    const tTime = new Date(r.createdAt || r.reportDate).getTime();
    if (tTime > maxTime) {
      maxTime = tTime;
      submissionTime = r.createdAt || r.reportDate;
    }
    if (!attachmentLink && r.attachmentLink) {
      attachmentLink = r.attachmentLink;
    }
  }

  return (
    <div className="space-y-8">
      <div className="border-b pb-4">
        <h2 className="text-xl font-bold tracking-tight mb-2">{t("reports.reportDetails")}</h2>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>{t("common.date")}: <span className="font-medium text-foreground">{formatDate(submissionTime)}</span></p>
          <p>{t("reports.submittedBy")}: <span className="font-medium text-foreground">{reports[0].name}</span></p>
        </div>
      </div>

      <div className="space-y-10">
        {reports.map((report: any) => (
          <div key={report._id} className="space-y-2">
            <h3 className="text-base font-bold uppercase tracking-wider text-primary border-b border-primary/10 pb-1">
              {report.teamName}
            </h3>
            <div className="pt-2">
              <p className="text-sm font-semibold text-muted-foreground mb-2">
                {t("reports.completedWorkOf", { teamName: report.teamName })}:
              </p>
              <div className="text-sm leading-relaxed whitespace-pre-wrap bg-muted/20 p-4 rounded-md border border-cardBorder">
                {report.completedWork || <span className="italic opacity-50">{t("reports.noCompletedWorkProvided")}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {attachmentLink && (
        <div className="pt-6 mt-6 border-t border-border">
          <p className="text-sm font-semibold text-muted-foreground mb-3">{t("reports.attachments")}:</p>
          <a
            href={attachmentLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 py-2 shadow-sm"
          >
            {t("reports.viewAttachmentLink")}
          </a>
        </div>
      )}
    </div>
  );
}
