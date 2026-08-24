"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm, type FieldErrors } from "react-hook-form";
import type { z } from "zod";
import { dailyReportSchema } from "@/lib/validation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SessionUser } from "@/lib/types";
import { ReportField, ReportInput, ReportSelect, ReportTextarea } from "@/components/forms/report-controls";

type DailyReportValues = z.infer<typeof dailyReportSchema>;

type ReportItem = {
  _id: string;
  teamName: string;
  reportType: DailyReportValues["reportType"];
  reportDate: string;
  attachmentLink?: string;
  dailyMeetingUpdate?: string;
  completedWork: string;
  pendingWork: string;
  blockers: string;
  requiredClarification: string;
  status: string;
  isLocked: boolean;
  canEdit: boolean;
};

function toDateInputValue(value?: string | Date | null) {
  if (!value) return new Date().toISOString().slice(0, 10);

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

export function EditReportForm({ reportId }: { reportId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [pendingTasks, setPendingTasks] = useState<string[]>([]);
  const [blockerTasks, setBlockerTasks] = useState<string[]>([]);
  const [completedDraft, setCompletedDraft] = useState("");
  const [pendingDraft, setPendingDraft] = useState("");
  const [blockerDraft, setBlockerDraft] = useState("");
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const response = await api.get("/api/auth/me");
      return response.data?.data as SessionUser | null;
    },
    staleTime: 60_000
  });
  const reportQuery = useQuery({
    queryKey: ["report", reportId],
    queryFn: async () => {
      const response = await api.get(`/api/reports/${reportId}`);
      return response.data?.data as ReportItem;
    }
  });
  const report = reportQuery.data;
  const { isLoading, isError, refetch: refetchReport } = reportQuery;
  const showDailyMeetingUpdate = Boolean(currentUser);
  const {
    register,
    setValue,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting }
  } = useForm<DailyReportValues>({
    defaultValues: {
      teamName: "",
      reportType: "Daily Update",
      reportDate: new Date().toISOString().slice(0, 10),
      attachmentLink: "",
      dailyMeetingUpdate: "",
      completedWork: "",
      pendingWork: "",
      blockers: "",
      requiredClarification: ""
    }
  });

  useEffect(() => {
    if (report?.teamName) {
      setValue("teamName", report.teamName);
    }
  }, [report?.teamName, setValue]);

  useEffect(() => {
    if (!report) return;
    reset({
      teamName: report.teamName ?? "",
      reportType: report.reportType ?? "Daily Update",
      reportDate: toDateInputValue(report.reportDate),
      attachmentLink: report.attachmentLink ?? "",
      dailyMeetingUpdate: report.dailyMeetingUpdate ?? "",
      completedWork: report.completedWork ?? "",
      pendingWork: report.pendingWork ?? "",
      blockers: report.blockers ?? "",
      requiredClarification: report.requiredClarification ?? ""
    });
    setCompletedTasks((report.completedWork ?? "").split("\n").filter(Boolean));
    setPendingTasks((report.pendingWork ?? "").split("\n").filter(Boolean));
    setBlockerTasks((report.blockers ?? "").split("\n").filter(Boolean));
    setCompletedDraft(report.completedWork ?? "");
    setPendingDraft(report.pendingWork ?? "");
    setBlockerDraft(report.blockers ?? "");
  }, [report, reset]);

  useEffect(() => {
    setValue("completedWork", completedTasks.join("\n"), { shouldDirty: true });
  }, [completedTasks, setValue]);

  useEffect(() => {
    setValue("pendingWork", pendingTasks.join("\n"), { shouldDirty: true });
  }, [pendingTasks, setValue]);

  useEffect(() => {
    setValue("blockers", blockerTasks.join("\n"), { shouldDirty: true });
  }, [blockerTasks, setValue]);

  const onSubmit = async (values: DailyReportValues) => {
    setMessage(null);
    try {
      const parsed = dailyReportSchema.safeParse(values);
      if (!parsed.success) {
        clearErrors();
        for (const issue of parsed.error.issues) {
          const fieldName = issue.path[0];
          if (typeof fieldName === "string") {
            setError(fieldName as keyof DailyReportValues, {
              type: issue.code,
              message: issue.message
            });
          }
        }
        const messages = parsed.error.issues.map((issue) => issue.message).filter(Boolean);
        setMessage(messages.length ? messages.join(" | ") : "Please fix the highlighted fields and try again.");
        return;
      }

      const response = await api.put(`/api/reports/${reportId}`, parsed.data);
      const updatedReport = response.data?.data as ReportItem | undefined;
      if (updatedReport) {
        reset({
          teamName: updatedReport.teamName ?? "",
          reportType: updatedReport.reportType ?? "Daily Update",
          reportDate: toDateInputValue(updatedReport.reportDate),
          attachmentLink: updatedReport.attachmentLink ?? "",
          dailyMeetingUpdate: updatedReport.dailyMeetingUpdate ?? "",
          completedWork: updatedReport.completedWork ?? "",
          pendingWork: updatedReport.pendingWork ?? "",
          blockers: updatedReport.blockers ?? "",
          requiredClarification: updatedReport.requiredClarification ?? ""
        });
      } else {
        await refetchReport();
      }
      setMessage("Report updated successfully.");
    } catch {
      setMessage("Update failed. Please try again.");
    }
  };

  const onInvalid = (validationErrors: FieldErrors<DailyReportValues>) => {
    const messages = Object.values(validationErrors)
      .map((error) => error?.message)
      .filter((message): message is string => Boolean(message));

    setMessage(messages.length ? messages.join(" | ") : "Please fix the highlighted fields and try again.");
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading report...</div>;
  }

  if (isError || !report) {
    return <div className="text-sm text-danger">Failed to load the report.</div>;
  }

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit, onInvalid)}>
      <div className="md:col-span-2 rounded-2xl border bg-background/70 p-4">
        <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Editing as</div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="soft">{currentUser?.name ?? "Loading user..."}</Badge>
          <span className="text-sm text-muted-foreground">{currentUser?.email ?? ""}</span>
          {report.teamName ? <Badge variant="outline">{report.teamName}</Badge> : null}
          {report.isLocked ? <Badge variant="outline">Locked</Badge> : null}
        </div>
        <div className="mt-3 text-xs text-muted-foreground">Only completed work is required. All other fields are optional.</div>
        {!report.canEdit ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {currentUser?.role === "team_member"
              ? "Team members need edit access approval before editing any submitted report."
              : "Team leads can edit same-day reports directly. For older reports, request edit access from an approver."}
          </div>
        ) : null}
      </div>
      <input type="hidden" {...register("teamName")} />
      <ReportField label="Report type" error={errors.reportType?.message}>
        <ReportSelect {...register("reportType")}>
          {["Daily Update", "Bug Fix", "Meeting Notes", "Blocker", "Attendance", "Other"].map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </ReportSelect>
      </ReportField>
      <ReportField label="Report date" error={errors.reportDate?.message}>
        <ReportInput type="date" readOnly={currentUser?.role !== "team_lead"} {...register("reportDate")} />
      </ReportField>
      {currentUser?.role !== "team_lead" ? (
        <p className="text-xs text-muted-foreground md:col-span-2">Date is set to today automatically for team members.</p>
      ) : (
        <p className="text-xs text-muted-foreground md:col-span-2">Team leads can choose any date for backfilled reports.</p>
      )}
      <ReportField className="md:col-span-2" label="Attachment link" error={errors.attachmentLink?.message}>
        <ReportInput
          type="url"
          inputMode="url"
          placeholder="Attachment link (optional)"
          {...register("attachmentLink")}
        />
      </ReportField>
      {showDailyMeetingUpdate ? (
        <ReportField
          className="md:col-span-2"
          label="Daily meeting update"
          helperText="Optional. Add only points that were not already mentioned in the meeting."
          error={errors.dailyMeetingUpdate?.message}
        >
          <ReportTextarea placeholder="Add any new meeting points here" {...register("dailyMeetingUpdate")} />
        </ReportField>
      ) : null}
      <input type="hidden" {...register("completedWork")} />
      <input type="hidden" {...register("pendingWork")} />
      <input type="hidden" {...register("blockers")} />
      <ReportField
        className="md:col-span-2"
        label="Completed Work"
        required
        helperText="Required. Paste or type completed tasks (one per line)."
        error={errors.completedWork?.message}
      >
        <ReportTextarea
          placeholder="Paste your completed work here..."
          value={completedDraft}
          onChange={(event) => {
            const value = event.target.value;
            const tasks = value
              .split("\n")
              .map((task) => task.replace(/^[-•*]\s*/, "").trim())
              .filter(Boolean);
            setCompletedDraft(value);
            setCompletedTasks(tasks);
          }}
        />
      </ReportField>
      <ReportField
        className="md:col-span-2"
        label="Pending Work"
        helperText="Optional. Paste pending tasks, one per line."
        error={errors.pendingWork?.message}
      >
        <ReportTextarea
          placeholder="Paste pending work here..."
          value={pendingDraft}
          onChange={(event) => {
            const value = event.target.value;
            const tasks = value
              .split("\n")
              .map((task) => task.replace(/^[-•*]\s*/, "").trim())
              .filter(Boolean);
            setPendingDraft(value);
            setPendingTasks(tasks);
          }}
        />
      </ReportField>
      <ReportField
        className="md:col-span-2"
        label="Blockers"
        helperText="Optional. Paste blockers, one per line."
        error={errors.blockers?.message}
      >
        <ReportTextarea
          placeholder="Paste blockers here..."
          value={blockerDraft}
          onChange={(event) => {
            const value = event.target.value;
            const tasks = value
              .split("\n")
              .map((task) => task.replace(/^[-•*]\s*/, "").trim())
              .filter(Boolean);
            setBlockerDraft(value);
            setBlockerTasks(tasks);
          }}
        />
      </ReportField>
      <ReportField className="md:col-span-2" label="Required clarification" error={errors.requiredClarification?.message}>
        <ReportTextarea placeholder="Required Clarification" {...register("requiredClarification")} />
      </ReportField>
      {message ? <p className="text-sm text-success md:col-span-2">{message}</p> : null}
      <Button className="md:col-span-2 w-fit" type="submit" disabled={isSubmitting || !report.canEdit}>
        {isSubmitting ? "Saving..." : report.canEdit ? "Save Changes" : "Edit Locked"}
      </Button>
    </form>
  );
}
