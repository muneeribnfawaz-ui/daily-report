"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, type FieldErrors } from "react-hook-form";
import type { z } from "zod";
import { dailyReportSchema } from "@/lib/validation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SessionUser } from "@/lib/types";
import { ReportField, ReportInput, ReportSelect, ReportTextarea } from "@/components/forms/report-controls";
import { ConstructionReportFields } from "../forms/construction-report-fields";
import { MarketingReportFields } from "../forms/marketing-report-fields";
import { formatDisplayName } from "@/lib/utils";

type ConstructionReportValues = z.infer<typeof dailyReportSchema>;

type ReportItem = {
  _id: string;
  teamName: string;
  reportType: ConstructionReportValues["reportType"];
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
  constructionWorkPlan?: any[];
  constructionMaterialUtilization?: any[];
  constructionTomorrowWorkPlan?: any[];
  marketingSelfItems?: any[];
  marketingClientItems?: any[];
};

function toDateInputValue(value?: string | Date | null) {
  if (!value) return new Date().toISOString().slice(0, 10);

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

export function EditConstructionReportForm({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [pendingTasks, setPendingTasks] = useState<string[]>([]);
  const [blockerTasks, setBlockerTasks] = useState<string[]>([]);
  const [completedDraft, setCompletedDraft] = useState("");
  const [pendingDraft, setPendingDraft] = useState("");
  const [blockerDraft, setBlockerDraft] = useState("");
  const [workPlanItems, setWorkPlanItems] = useState<any[]>([]);
  const [materialItems, setMaterialItems] = useState<any[]>([]);
  const [tomorrowWorkPlanItems, setTomorrowWorkPlanItems] = useState<any[]>([]);
  const [marketingSelfItems, setMarketingSelfItems] = useState<any[]>([]);
  const [marketingClientItems, setMarketingClientItems] = useState<any[]>([]);
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
    control,
    formState: { errors, isSubmitting }
  } = useForm<ConstructionReportValues>({
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

  const formValues = useWatch({ control });
  const draftLoadedKeyRef = useRef<string | null>(null);
  const draftStorageKey = currentUser?.id && reportId
    ? `daily-report-draft-edit:${currentUser.id}:${reportId}`
    : null;

  const isConstructionTeam = (currentUser?.departments ?? []).some((d: any) => 
    (typeof d === "string" ? d : d.name) === "Construction"
  ) || (report?.teamName && report.teamName.toLowerCase().includes("construction"))
    || (report?.constructionWorkPlan && report.constructionWorkPlan.length > 0)
    || (report?.constructionMaterialUtilization && report.constructionMaterialUtilization.length > 0)
    || (report?.constructionTomorrowWorkPlan && report.constructionTomorrowWorkPlan.length > 0);

  const isMarketingTeam = (currentUser?.departments ?? []).some((d: any) => 
    (typeof d === "string" ? d : d.name) === "Marketing"
  ) || (report?.teamName && report.teamName.toLowerCase().includes("marketing"))
    || (report?.marketingSelfItems && report.marketingSelfItems.length > 0)
    || (report?.marketingClientItems && report.marketingClientItems.length > 0);

  useEffect(() => {
    if (report?.teamName) {
      setValue("teamName", report.teamName);
    }
  }, [report?.teamName, setValue]);

  useEffect(() => {
    if (!report) return;

    if (draftStorageKey) {
      const storedDraft = window.localStorage.getItem(draftStorageKey);
      if (storedDraft) {
        try {
          const parsedDraft = JSON.parse(storedDraft) as any;
          if (parsedDraft.values) {
            reset({
              teamName: parsedDraft.values.teamName ?? report.teamName ?? "",
              reportType: parsedDraft.values.reportType ?? report.reportType ?? "Daily Update",
              reportDate: parsedDraft.values.reportDate ?? toDateInputValue(report.reportDate),
              attachmentLink: parsedDraft.values.attachmentLink ?? report.attachmentLink ?? "",
              dailyMeetingUpdate: parsedDraft.values.dailyMeetingUpdate ?? report.dailyMeetingUpdate ?? "",
              completedWork: parsedDraft.values.completedWork ?? report.completedWork ?? "",
              pendingWork: parsedDraft.values.pendingWork ?? report.pendingWork ?? "",
              blockers: parsedDraft.values.blockers ?? report.blockers ?? "",
              requiredClarification: parsedDraft.values.requiredClarification ?? report.requiredClarification ?? ""
            });
            setCompletedTasks(parsedDraft.completedTasks ?? []);
            setPendingTasks(parsedDraft.pendingTasks ?? []);
            setBlockerTasks(parsedDraft.blockerTasks ?? []);
            setCompletedDraft(parsedDraft.completedDraft ?? "");
            setPendingDraft(parsedDraft.pendingDraft ?? "");
            setBlockerDraft(parsedDraft.blockerDraft ?? "");
            setWorkPlanItems(parsedDraft.workPlanItems ?? []);
            setMaterialItems(parsedDraft.materialItems ?? []);
            setTomorrowWorkPlanItems(parsedDraft.tomorrowWorkPlanItems ?? []);
            setMarketingSelfItems(parsedDraft.marketingSelfItems ?? []);
            setMarketingClientItems(parsedDraft.marketingClientItems ?? []);
            draftLoadedKeyRef.current = draftStorageKey;
            return;
          }
        } catch {
          window.localStorage.removeItem(draftStorageKey);
        }
      }
    }

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
    setWorkPlanItems(report.constructionWorkPlan ?? []);
    setMaterialItems(report.constructionMaterialUtilization ?? []);
    setTomorrowWorkPlanItems(report.constructionTomorrowWorkPlan ?? []);
    setMarketingSelfItems(report.marketingSelfItems ?? []);
    setMarketingClientItems(report.marketingClientItems ?? []);
    draftLoadedKeyRef.current = draftStorageKey;
  }, [report, reset, draftStorageKey]);

  useEffect(() => {
    if (!draftStorageKey) return;
    if (draftLoadedKeyRef.current !== draftStorageKey) return;

    window.localStorage.setItem(
      draftStorageKey,
      JSON.stringify({
        values: formValues,
        completedTasks,
        pendingTasks,
        blockerTasks,
        completedDraft,
        pendingDraft,
        blockerDraft,
        workPlanItems,
        materialItems,
        tomorrowWorkPlanItems,
        marketingSelfItems,
        marketingClientItems
      })
    );
  }, [
    formValues,
    completedTasks,
    pendingTasks,
    blockerTasks,
    completedDraft,
    pendingDraft,
    blockerDraft,
    workPlanItems,
    materialItems,
    tomorrowWorkPlanItems,
    marketingSelfItems,
    marketingClientItems,
    draftStorageKey
  ]);

  useEffect(() => {
    setValue("completedWork", completedTasks.join("\n"), { shouldDirty: true });
  }, [completedTasks, setValue]);

  useEffect(() => {
    setValue("pendingWork", pendingTasks.join("\n"), { shouldDirty: true });
  }, [pendingTasks, setValue]);

  useEffect(() => {
    setValue("blockers", blockerTasks.join("\n"), { shouldDirty: true });
  }, [blockerTasks, setValue]);

  const onSubmit = async (values: ConstructionReportValues) => {
    setMessage(null);
    if (isMarketingTeam && marketingSelfItems.length === 0 && marketingClientItems.length === 0) {
      setMessage("You must add at least one row in either the Marketing Self or Marketing Client table.");
      return;
    }
    try {
      const payload = {
        ...values,
        constructionWorkPlan: isConstructionTeam ? workPlanItems : [],
        constructionMaterialUtilization: isConstructionTeam ? materialItems : [],
        constructionTomorrowWorkPlan: isConstructionTeam ? tomorrowWorkPlanItems : [],
        marketingSelfItems: isMarketingTeam ? marketingSelfItems : [],
        marketingClientItems: isMarketingTeam ? marketingClientItems : []
      };
      
      const parsed = dailyReportSchema.safeParse(payload);
      if (!parsed.success) {
        clearErrors();
        for (const issue of parsed.error.issues) {
          const fieldName = issue.path[0];
          if (typeof fieldName === "string") {
            setError(fieldName as keyof ConstructionReportValues, {
              type: issue.code,
              message: issue.message
            });
          }
        }
        let hasMarketingError = false;
        const messages = parsed.error.issues.map((issue) => {
          if (issue.path[0] === "marketingSelfItems" || issue.path[0] === "marketingClientItems") {
            hasMarketingError = true;
            return null;
          }
          return issue.message;
        }).filter(Boolean);
        
        if (hasMarketingError) {
          messages.push("Please fill all mandatory fields (*) correctly in the Marketing tables.");
        }
        
        const uniqueMessages = Array.from(new Set(messages));
        setMessage(uniqueMessages.length ? uniqueMessages.join(" | ") : "Please fix the highlighted fields and try again.");
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
        setWorkPlanItems(updatedReport.constructionWorkPlan ?? []);
        setMaterialItems(updatedReport.constructionMaterialUtilization ?? []);
        setTomorrowWorkPlanItems(updatedReport.constructionTomorrowWorkPlan ?? []);
        setMarketingSelfItems(updatedReport.marketingSelfItems ?? []);
        setMarketingClientItems(updatedReport.marketingClientItems ?? []);
      } else {
        await refetchReport();
      }
      
      if (draftStorageKey) {
        window.localStorage.removeItem(draftStorageKey);
      }
      
      setMessage("Report updated successfully.");
      router.push(`/daily-report/${reportId}/preview`);
    } catch {
      setMessage("Update failed. Please try again.");
    }
  };

  const onInvalid = (validationErrors: FieldErrors<ConstructionReportValues>) => {
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
          {report.teamName ? <Badge variant="outline">{formatDisplayName(report.teamName)}</Badge> : null}
          {report.isLocked ? <Badge variant="outline">Locked</Badge> : null}
          <Badge variant="soft" className="bg-amber-100 text-amber-800 hover:bg-amber-100">Status: Draft</Badge>
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
      {(!isConstructionTeam && !isMarketingTeam) ? (
        <>
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
        </>
      ) : isConstructionTeam ? (
        <ConstructionReportFields
          workPlanItems={workPlanItems}
          setWorkPlanItems={setWorkPlanItems}
          materialItems={materialItems}
          setMaterialItems={setMaterialItems}
          tomorrowWorkPlanItems={tomorrowWorkPlanItems}
          setTomorrowWorkPlanItems={setTomorrowWorkPlanItems}
        />
      ) : null}
      {message ? <p className={`text-sm md:col-span-2 ${message.toLowerCase().includes("success") ? "text-success" : "text-destructive font-medium"}`}>{message}</p> : null}
      <Button className="md:col-span-2 w-fit" type="submit" disabled={isSubmitting || !report.canEdit}>
        {isSubmitting ? "Saving..." : report.canEdit ? "Save Changes" : "Edit Locked"}
      </Button>
    </form>
  );
}
